$projectPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$phpPath = 'D:\xampp\php\php.exe'
$publicPath = Join-Path $projectPath 'public'
$routerPath = Join-Path $publicPath 'index.php'

& $phpPath -d upload_max_filesize=200M -d post_max_size=210M -S 127.0.0.1:8000 -t $publicPath $routerPath
