import React, { useState, useEffect } from 'react';
import AnimatedCounter from '../components/AnimatedCounter';
import { useLanguage } from '../contexts/LanguageContext';

// Google Sheet Configuration
// Sheet ID provided by user
const SHEET_ID = '1nDr9utmwiy6aGn4pP1A19ApUlz9B-HqOBgj5G4eEQL0';
// Using Google Visualization API to get CSV output
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;

interface StatCardProps {
    title: string;
    value: number;
    icon: string;
    color: string;
    delay: number;
    isLive?: boolean;
    noAnimation?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, delay, isLive, noAnimation }) => {
    return (
        <div 
            className={`bg-slate-900/50 backdrop-blur-md border border-slate-700/50 p-6 rounded-2xl relative overflow-hidden group opacity-0 animate-fade-in-up hover:border-secondary/50 transition-all duration-500`}
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className={`absolute -right-6 -top-6 w-32 h-32 rounded-full opacity-5 transition-transform group-hover:scale-150 duration-700 ${color}`}></div>
            
            <div className="relative z-10 flex justify-between items-start">
                <div>
                    <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                        {title}
                        {isLive && (
                             <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                        )}
                    </p>
                    <div className="text-4xl md:text-5xl font-black text-white">
                        {/* If noAnimation is true, show raw value for instant 'Real-Time' feel, otherwise animate */}
                        {noAnimation ? (
                            <span>{value.toLocaleString()}</span>
                        ) : (
                            <AnimatedCounter end={value} />
                        )}
                    </div>
                </div>
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-lg border border-white/5 ${color} bg-opacity-20`}>
                    {icon}
                </div>
            </div>
            
            <div className="mt-6 flex items-center gap-2 text-xs text-zinc-500 font-mono">
                {isLive ? 'Live Session Count' : 'Real-time Sync'}
            </div>
        </div>
    );
};

const PublicDashboard: React.FC = () => {
    const { t } = useLanguage();
    const [stats, setStats] = useState({
        uniqueVisitors: 0,
        customers: 0,
        stores: 0,
        partners: 0
    });
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

    const syncData = async () => {
        try {
            // Add timestamp to bypass caching for real-time updates
            const res = await fetch(`${SHEET_URL}&t=${Date.now()}`);
            const text = await res.text();
            
            // Check for Auth wall (HTML response instead of CSV)
            if (text.startsWith('<!doctype')) {
                console.warn("Google Sheet is not public. Please check sharing settings.");
                return;
            }
            
            // Parse CSV format from GViz
            // Logic: Split by new line -> Split by comma -> Remove quotes
            const rows = text.split('\n').map(row => 
                row.split(',').map(cell => cell.replace(/["']/g, '').trim())
            );

            // We expect the data to be in the 2nd row (index 1), as index 0 is headers
            // Column Order based on user request: 
            // 0: Unique Visitors | 1: Total Users | 2: Store Partners | 3: Delivery Fleet
            if (rows.length > 1) {
                const dataRow = rows[1];
                
                setStats({
                    uniqueVisitors: parseInt(dataRow[0] || '0', 10),
                    customers: parseInt(dataRow[1] || '0', 10),
                    stores: parseInt(dataRow[2] || '0', 10),
                    partners: parseInt(dataRow[3] || '0', 10)
                });
            }
        } catch (error) {
            console.error("Failed to sync sheet data:", error);
        } finally {
            setLastUpdated(new Date());
        }
    };

    // --- LISTENERS ---
    useEffect(() => {
        syncData();
        
        // Auto-Polling: Update every 5 seconds to catch manual changes in the sheet
        const pollInterval = setInterval(syncData, 5000);

        return () => {
            clearInterval(pollInterval);
        };
    }, []);

    return (
        <div className="min-h-screen pt-28 pb-20 bg-[#050510] text-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-end border-b border-zinc-800 pb-8 mb-12 animate-fade-in">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight">
                            {t('Network')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">{t('Analytics')}</span>
                        </h1>
                        <p className="text-zinc-400 mt-2">{t('Live ecosystem metrics and platform traffic.')}</p>
                    </div>
                    <div className="mt-4 md:mt-0 text-right">
                        <div className="flex items-center justify-end gap-2 text-green-400 text-sm font-bold mb-1">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            {t('SYSTEM ONLINE')}
                        </div>
                        <p className="text-zinc-600 text-xs font-mono">{t('Last Sync')}: {lastUpdated.toLocaleTimeString()}</p>
                    </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                     <StatCard 
                        title={t('Unique Visitors')}
                        value={stats.uniqueVisitors} 
                        icon="👀" 
                        color="bg-pink-500" 
                        delay={0}
                        isLive={true} 
                        // Set noAnimation to false if you want the counter effect, true if you want instant number updates
                        noAnimation={false} 
                    />
                    <StatCard 
                        title={t('Total Users')}
                        value={stats.customers} 
                        icon="👥" 
                        color="bg-purple-500" 
                        delay={100} 
                    />
                    <StatCard 
                        title={t('Store Partners')}
                        value={stats.stores} 
                        icon="🏪" 
                        color="bg-amber-500" 
                        delay={200} 
                    />
                    <StatCard 
                        title={t('Delivery Fleet')}
                        value={stats.partners} 
                        icon="🛵" 
                        color="bg-cyan-500" 
                        delay={300} 
                    />
                </div>
            </div>
        </div>
    );
};

export default PublicDashboard;