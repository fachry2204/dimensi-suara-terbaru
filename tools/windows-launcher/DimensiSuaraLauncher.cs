using System;
using System.Diagnostics;
using System.IO;
using System.Net.Sockets;
using System.Runtime.InteropServices;
using System.Threading;

internal static class DimensiSuaraLauncher
{
    private const int Port = 3000;
    private const string AppUrl = "http://localhost:3000";
    private static Process serverProcess;
    private static IntPtr jobHandle = IntPtr.Zero;

    public static int Main()
    {
        Console.Title = "Dimensi Suara Server";
        Console.OutputEncoding = System.Text.Encoding.UTF8;

        Console.WriteLine("==================================================");
        Console.WriteLine("             DIMENSI SUARA SERVER");
        Console.WriteLine("==================================================");
        Console.WriteLine();

        string appDirectory = FindApplicationDirectory();
        if (appDirectory == null)
        {
            return Fail("Folder aplikasi tidak ditemukan. Simpan EXE ini di folder utama aplikasi Dimensi Suara.");
        }

        string nextCli = Path.Combine(appDirectory, "node_modules", "next", "dist", "bin", "next");
        if (!File.Exists(nextCli))
        {
            return Fail("Dependency aplikasi belum tersedia. Jalankan 'npm install' satu kali di folder aplikasi.");
        }

        string nodeExecutable = FindNodeExecutable();
        if (nodeExecutable == null)
        {
            return Fail("Node.js tidak ditemukan. Instal Node.js LTS terlebih dahulu.");
        }

        if (IsPortOpen(Port))
        {
            Console.WriteLine("Server pada port 3000 sudah aktif.");
            OpenBrowser(AppUrl);
            Console.WriteLine("Tekan tombol apa saja untuk menutup launcher...");
            Console.ReadKey(true);
            return 0;
        }

        string buildId = Path.Combine(appDirectory, ".next", "BUILD_ID");
        if (!File.Exists(buildId))
        {
            Console.WriteLine("Build produksi belum tersedia. Membuat build otomatis...");
            int buildExitCode = RunAndWait(nodeExecutable, Quote(nextCli) + " build", appDirectory);
            if (buildExitCode != 0 || !File.Exists(buildId))
            {
                return Fail("Build aplikasi gagal. Periksa pesan error di atas.");
            }
            Console.WriteLine("Build berhasil.");
            Console.WriteLine();
        }

        AppDomain.CurrentDomain.ProcessExit += delegate(object sender, EventArgs eventArgs) { StopServer(); };
        Console.CancelKeyPress += delegate(object sender, ConsoleCancelEventArgs eventArgs)
        {
            eventArgs.Cancel = true;
            StopServer();
            Environment.Exit(0);
        };

        Console.WriteLine("Menjalankan server produksi...");
        serverProcess = StartProcess(nodeExecutable, Quote(nextCli) + " start -p " + Port, appDirectory);
        if (serverProcess == null)
        {
            return Fail("Server tidak dapat dijalankan.");
        }

        AttachToKillOnCloseJob(serverProcess);

        bool ready = WaitUntilReady(serverProcess, Port, TimeSpan.FromSeconds(90));
        if (!ready)
        {
            int code = serverProcess.HasExited ? serverProcess.ExitCode : -1;
            StopServer();
            return Fail("Server gagal siap dalam 90 detik. Exit code: " + code);
        }

        Console.WriteLine();
        Console.WriteLine("Server aktif: " + AppUrl);
        Console.WriteLine("Browser akan dibuka otomatis.");
        Console.WriteLine("Tutup jendela ini atau tekan Ctrl+C untuk menghentikan server.");
        Console.WriteLine();

        if (Environment.GetEnvironmentVariable("DIMENSI_SUARA_NO_BROWSER") != "1")
        {
            OpenBrowser(AppUrl);
        }

        serverProcess.WaitForExit();
        int exitCode = serverProcess.ExitCode;
        StopServer();

        if (exitCode != 0)
        {
            return Fail("Server berhenti dengan exit code: " + exitCode);
        }

        return 0;
    }

    private static string FindApplicationDirectory()
    {
        string current = AppDomain.CurrentDomain.BaseDirectory;
        for (int depth = 0; depth < 3; depth++)
        {
            if (File.Exists(Path.Combine(current, "package.json")))
            {
                return current;
            }

            DirectoryInfo parent = Directory.GetParent(current);
            if (parent == null)
            {
                break;
            }
            current = parent.FullName;
        }
        return null;
    }

    private static string FindNodeExecutable()
    {
        string configured = Environment.GetEnvironmentVariable("NODE_EXE");
        if (!string.IsNullOrWhiteSpace(configured) && File.Exists(configured))
        {
            return configured;
        }

        string programFilesNode = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles),
            "nodejs",
            "node.exe"
        );
        if (File.Exists(programFilesNode))
        {
            return programFilesNode;
        }

        string pathValue = Environment.GetEnvironmentVariable("PATH");
        if (pathValue != null)
        {
            foreach (string path in pathValue.Split(Path.PathSeparator))
            {
                try
                {
                    string candidate = Path.Combine(path.Trim(), "node.exe");
                    if (File.Exists(candidate))
                    {
                        return candidate;
                    }
                }
                catch
                {
                    // Abaikan entri PATH yang tidak valid.
                }
            }
        }

        return null;
    }

    private static int RunAndWait(string executable, string arguments, string workingDirectory)
    {
        Process process = StartProcess(executable, arguments, workingDirectory);
        if (process == null)
        {
            return -1;
        }
        using (process)
        {
            process.WaitForExit();
            return process.ExitCode;
        }
    }

    private static Process StartProcess(string executable, string arguments, string workingDirectory)
    {
        ProcessStartInfo startInfo = new ProcessStartInfo
        {
            FileName = executable,
            Arguments = arguments,
            WorkingDirectory = workingDirectory,
            UseShellExecute = false,
            CreateNoWindow = false
        };
        return Process.Start(startInfo);
    }

    private static bool WaitUntilReady(Process process, int port, TimeSpan timeout)
    {
        Stopwatch timer = Stopwatch.StartNew();
        while (timer.Elapsed < timeout)
        {
            if (process.HasExited)
            {
                return false;
            }
            if (IsPortOpen(port))
            {
                return true;
            }
            Thread.Sleep(500);
        }
        return false;
    }

    private static bool IsPortOpen(int port)
    {
        try
        {
            using (TcpClient client = new TcpClient())
            {
                IAsyncResult result = client.BeginConnect("127.0.0.1", port, null, null);
                using (WaitHandle waitHandle = result.AsyncWaitHandle)
                {
                    if (!waitHandle.WaitOne(TimeSpan.FromMilliseconds(400)))
                    {
                        return false;
                    }
                }
                client.EndConnect(result);
                return true;
            }
        }
        catch
        {
            return false;
        }
    }

    private static void OpenBrowser(string url)
    {
        try
        {
            Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
        }
        catch (Exception exception)
        {
            Console.WriteLine("Browser tidak dapat dibuka otomatis: " + exception.Message);
            Console.WriteLine("Buka manual: " + url);
        }
    }

    private static void StopServer()
    {
        try
        {
            if (jobHandle != IntPtr.Zero)
            {
                CloseHandle(jobHandle);
                jobHandle = IntPtr.Zero;
            }
            if (serverProcess != null && !serverProcess.HasExited)
            {
                serverProcess.Kill();
                serverProcess.WaitForExit(5000);
            }
        }
        catch
        {
            // Job Object tetap memastikan seluruh proses anak dihentikan.
        }
        finally
        {
            if (serverProcess != null)
            {
                serverProcess.Dispose();
            }
            serverProcess = null;
            if (jobHandle != IntPtr.Zero)
            {
                CloseHandle(jobHandle);
                jobHandle = IntPtr.Zero;
            }
        }
    }

    private static void AttachToKillOnCloseJob(Process process)
    {
        jobHandle = CreateJobObject(IntPtr.Zero, null);
        if (jobHandle == IntPtr.Zero)
        {
            return;
        }

        JOBOBJECT_EXTENDED_LIMIT_INFORMATION info = new JOBOBJECT_EXTENDED_LIMIT_INFORMATION();
        info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
        int length = Marshal.SizeOf(info);
        IntPtr infoPointer = Marshal.AllocHGlobal(length);
        try
        {
            Marshal.StructureToPtr(info, infoPointer, false);
            if (!SetInformationJobObject(jobHandle, JobObjectExtendedLimitInformation, infoPointer, (uint)length) ||
                !AssignProcessToJobObject(jobHandle, process.Handle))
            {
                CloseHandle(jobHandle);
                jobHandle = IntPtr.Zero;
            }
        }
        finally
        {
            Marshal.FreeHGlobal(infoPointer);
        }
    }

    private static string Quote(string value)
    {
        return "\"" + value + "\"";
    }

    private static int Fail(string message)
    {
        Console.ForegroundColor = ConsoleColor.Red;
        Console.WriteLine();
        Console.WriteLine("ERROR: " + message);
        Console.ResetColor();
        Console.WriteLine();
        Console.WriteLine("Tekan tombol apa saja untuk menutup...");
        if (!Console.IsInputRedirected)
        {
            Console.ReadKey(true);
        }
        return 1;
    }

    private const uint JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x00002000;
    private const int JobObjectExtendedLimitInformation = 9;

    [StructLayout(LayoutKind.Sequential)]
    private struct JOBOBJECT_BASIC_LIMIT_INFORMATION
    {
        public long PerProcessUserTimeLimit;
        public long PerJobUserTimeLimit;
        public uint LimitFlags;
        public UIntPtr MinimumWorkingSetSize;
        public UIntPtr MaximumWorkingSetSize;
        public uint ActiveProcessLimit;
        public UIntPtr Affinity;
        public uint PriorityClass;
        public uint SchedulingClass;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct IO_COUNTERS
    {
        public ulong ReadOperationCount;
        public ulong WriteOperationCount;
        public ulong OtherOperationCount;
        public ulong ReadTransferCount;
        public ulong WriteTransferCount;
        public ulong OtherTransferCount;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION
    {
        public JOBOBJECT_BASIC_LIMIT_INFORMATION BasicLimitInformation;
        public IO_COUNTERS IoInfo;
        public UIntPtr ProcessMemoryLimit;
        public UIntPtr JobMemoryLimit;
        public UIntPtr PeakProcessMemoryUsed;
        public UIntPtr PeakJobMemoryUsed;
    }

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)]
    private static extern IntPtr CreateJobObject(IntPtr securityAttributes, string name);

    [DllImport("kernel32.dll")]
    private static extern bool SetInformationJobObject(IntPtr job, int infoClass, IntPtr info, uint length);

    [DllImport("kernel32.dll")]
    private static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);

    [DllImport("kernel32.dll")]
    private static extern bool CloseHandle(IntPtr handle);
}
