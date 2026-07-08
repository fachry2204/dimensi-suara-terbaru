import * as Icons from 'tabler-icons-react';
import HkBadge from '@/components/@hk-badge/@hk-badge';

export const SidebarMenu = [
    {
        group: 'Utama',
        id: 'utama_admin',
        contents: [
            {
                name: 'Dashboard Admin',
                icon: <Icons.Dashboard />,
                path: '/admin',
            },
        ]
    },
    {
        group: 'Utama',
        id: 'utama_user_aggregator',
        contents: [
            {
                name: 'Dashboard',
                icon: <Icons.Dashboard />,
                path: '/aggregator',
            },
        ]
    },
    {
        group: 'Aggregator',
        contents: [
            {
                name: 'Data Rilis',
                icon: <Icons.Disc />,
                path: '/releases',
            },
            {
                name: 'Data Artis',
                icon: <Icons.Microphone2 />,
                path: '/artists',
            },
        ]
    },
    {
        group: 'Laporan Aggregator',
        contents: [
            {
                name: 'Statistik',
                icon: <Icons.ChartBar />,
                path: '/reports/statistics',
            },
            {
                name: 'Laporan Aggregator',
                icon: <Icons.ClipboardList />,
                path: '/reports/list',
            },
            {
                name: 'Pembayaran',
                icon: <Icons.CreditCard />,
                path: '/reports/payments',
            }
        ]
    },
    {
        group: 'Utama',
        id: 'utama_publishing',
        contents: [
            {
                name: 'Dashboard',
                icon: <Icons.Dashboard />,
                path: '/publishing',
            }
        ]
    },
    {
        group: 'Publishing',
        contents: [
            {
                name: 'Data Pencipta',
                icon: <Icons.UserPlus />,
                path: '/publishing/writer',
            },
            {
                name: 'Data Lagu',
                icon: <Icons.ListDetails />,
                path: '/publishing/songs',
            }
        ]
    },
    {
        group: 'Laporan Publishing',
        contents: [
            {
                name: 'Statistik',
                icon: <Icons.ChartBar />,
                path: '/publishing/reports/statistics',
            },
            {
                name: 'Laporan',
                icon: <Icons.ClipboardList />,
                path: '/publishing/reports/list',
            },
            {
                name: 'Pembayaran',
                icon: <Icons.CreditCard />,
                path: '/publishing/reports/payments',
            }
        ]
    },
    {
        group: 'Laporan Admin',
        id: 'laporan_admin',
        contents: [
            {
                name: 'Statistik',
                icon: <Icons.ChartBar />,
                path: '/admin/statistics',
            },
            {
                name: 'Upload Laporan',
                icon: <Icons.CloudUpload />,
                path: '/admin/upload-report',
            },
            {
                name: 'Pembayaran',
                icon: <Icons.CreditCard />,
                path: '/admin/payments',
            }
        ]
    },
    {
        group: 'Pengaturan',
        contents: [
            {
                name: 'Data User',
                icon: <Icons.UserPlus />,
                path: '/users',
            },
            {
                id: 'settings_menu',
                name: 'Pengaturan',
                icon: <Icons.Settings />,
                path: '/settings',
            }
        ]
    },
    {
        group: 'Layanan Lain',
        id: 'switch_service_publishing',
        contents: [
            {
                name: 'Menu Publishing',
                icon: <Icons.ClipboardList />,
                path: '/publishing',
            },
            {
                name: 'Kontrak',
                icon: <Icons.FileText />,
                path: '/contracts',
            },
            {
                name: 'Tiket Bantuan',
                icon: <Icons.MessageReport />,
                path: '/tickets',
            }
        ]
    },
    {
        group: 'Layanan Lain',
        id: 'switch_service_aggregator',
        contents: [
            {
                name: 'Menu Aggregator',
                icon: <Icons.Dashboard />,
                path: '/aggregator',
            },
            {
                name: 'Kontrak',
                icon: <Icons.FileText />,
                path: '/publishing/contracts',
            },
            {
                name: 'Tiket Bantuan',
                icon: <Icons.MessageReport />,
                path: '/tickets',
            }
        ]
    }
];
