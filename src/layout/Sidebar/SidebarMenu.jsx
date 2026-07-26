import * as Icons from 'tabler-icons-react';

export const SidebarMenu = [
    {
        group: 'Utama',
        id: 'utama_user_aggregator',
        contents: [
            {
                name: 'Dashboard',
                icon: <Icons.Dashboard />,
                path: '/user/aggregator',
            },
        ]
    },
    {
        group: 'Aggregator',
        contents: [
            {
                name: 'Data Rilis',
                icon: <Icons.Disc />,
                path: '/user/my-releases',
            },
            {
                name: 'Data Artis',
                icon: <Icons.Microphone2 />,
                path: '/user/aggregator/artists',
            },
        ]
    },
    {
        group: 'Report',
        contents: [
            {
                name: 'Analitik',
                icon: <Icons.ChartBar />,
                path: '/user/reports/statistics',
            },
            {
                name: 'Report',
                icon: <Icons.ClipboardList />,
                path: '/user/reports/list',
            },
            {
                name: 'Pembayaran',
                icon: <Icons.CreditCard />,
                path: '/user/reports/payments',
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
                path: '/user/publishing',
            }
        ]
    },
    {
        group: 'Publishing',
        contents: [
            {
                name: 'Data Pencipta',
                icon: <Icons.UserPlus />,
                path: '/user/publishing/writer',
            },
            {
                name: 'Data Lagu',
                icon: <Icons.ListDetails />,
                path: '/user/publishing/songs',
            }
        ]
    },
    {
        group: 'Laporan Publishing',
        contents: [
            {
                name: 'Statistik',
                icon: <Icons.ChartBar />,
                path: '/user/publishing/reports/statistics',
            },
            {
                name: 'Laporan',
                icon: <Icons.ClipboardList />,
                path: '/user/publishing/reports/list',
            },
            {
                name: 'Pembayaran',
                icon: <Icons.CreditCard />,
                path: '/user/publishing/reports/payments',
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
                path: '/user/publishing',
            },
            {
                name: 'Kontrak',
                icon: <Icons.FileText />,
                path: '/user/aggregator/contracts',
            },
            {
                name: 'Tiket Bantuan',
                icon: <Icons.MessageReport />,
                path: '/user/tickets',
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
                path: '/user/aggregator',
            },
            {
                name: 'Kontrak',
                icon: <Icons.FileText />,
                path: '/user/publishing/contracts',
            },
            {
                name: 'Tiket Bantuan',
                icon: <Icons.MessageReport />,
                path: '/user/tickets',
            }
        ]
    }
];
