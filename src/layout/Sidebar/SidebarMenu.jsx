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
        group: 'Settings',
        contents: [
            {
                name: 'Users',
                icon: <Icons.UserPlus />,
                path: '/users',
            }
        ]
    }
];