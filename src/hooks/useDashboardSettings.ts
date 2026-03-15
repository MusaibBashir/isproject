import { useState, useEffect } from 'react';

export function useDashboardSettings<T extends Record<string, boolean>>(dashboardId: string, defaultSettings: T) {
    const [settings, setSettings] = useState<T>(() => {
        const stored = localStorage.getItem(`dashboard_settings_${dashboardId}`);
        if (stored) {
            try {
                return { ...defaultSettings, ...JSON.parse(stored) } as T;
            } catch (e) {
                return defaultSettings;
            }
        }
        return defaultSettings;
    });

    useEffect(() => {
        localStorage.setItem(`dashboard_settings_${dashboardId}`, JSON.stringify(settings));
    }, [settings, dashboardId]);

    const toggleSetting = (key: keyof T) => {
        setSettings(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    return { settings, toggleSetting };
}
