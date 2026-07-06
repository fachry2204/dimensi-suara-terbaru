import * as Icons from 'tabler-icons-react';
import HkBadge from '@/components/@hk-badge/@hk-badge';

export const SidebarMenu = [
    {
        group: 'Main',
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
                id: 'aggregator_publishing',
                name: 'Publishing',
                icon: <Icons.Book2 />,
                path: '/publishing',
                childrens: [
                    {
                        name: 'Data Pencipta',
                        path: '/publishing/writer',
                    },
                    {
                        name: 'Data Lagu',
                        path: '/publishing/songs',
                    },
                    {
                        name: 'Analitik',
                        path: '/publishing/analytics',
                    },
                    {
                        name: 'Laporan',
                        path: '/publishing/reports',
                    }
                ]
            }
        ]
    },

    {
        group: 'Settings',
        contents: [
            {
                name: 'Data User',
                icon: <Icons.UserPlus />,
                path: '/users',
            },
            {
                id: 'settings_menu',
                name: 'Setting',
                icon: <Icons.Settings />,
                path: '/settings',
                childrens: [
                    {
                        name: 'Setting System',
                        path: '/settings#system',
                    },
                    {
                        name: 'Setting Aggregator',
                        path: '/settings#general',
                    },
                    {
                        name: 'Setting Email',
                        path: '/settings#gateway',
                    }
                ]
            }
        ]
    }
];