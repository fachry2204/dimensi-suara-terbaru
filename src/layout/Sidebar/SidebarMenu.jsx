import * as Icons from 'tabler-icons-react';
import HkBadge from '@/components/@hk-badge/@hk-badge';

export const SidebarMenu = [
    {
        group: 'Utama',
        contents: [
            {
                name: 'Dashboard',
                icon: <Icons.Dashboard />,
                path: '/dashboard-aggregator',
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
            {
                id: 'aggregator_reports',
                name: 'Laporan',
                icon: <Icons.ChartBar />,
                path: '/reports',
                childrens: [
                    {
                        name: 'Statistik',
                        path: '/reports/statistics',
                    },
                    {
                        name: 'Daftar Laporan',
                        path: '/reports/list',
                    }
                ]
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
            },
            {
                name: 'Laporan',
                icon: <Icons.ClipboardList />,
                path: '/publishing/reports',
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
    }
];
