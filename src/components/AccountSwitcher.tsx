import { useState, useEffect } from "react";
import { useAuth, BusinessAccount } from "../context/AuthContext";
import { ChevronDown, Plus, Store, Check } from "lucide-react";
import { Button } from "./ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
    DropdownMenuItem,
} from "./ui/dropdown-menu";
import { toast } from "sonner";

interface AccountSwitcherProps {
    onAccountSwitch?: () => void;
}

export function AccountSwitcher({ onAccountSwitch }: AccountSwitcherProps) {
    const { activeBusinessAccount, businessAccounts, switchBusinessAccount } = useAuth();
    const [isLoadingSwitch, setIsLoadingSwitch] = useState(false);

    if (!activeBusinessAccount || businessAccounts.length === 0) {
        return null;
    }

    const handleSwitch = async (accountId: string) => {
        if (accountId === activeBusinessAccount.id) return;

        setIsLoadingSwitch(true);
        try {
            const { error } = await switchBusinessAccount(accountId);
            if (error) {
                toast.error(error || "Failed to switch account");
            } else {
                toast.success("Account switched successfully");
                onAccountSwitch?.();
                // Force reload page to update all data
                window.location.reload();
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to switch account");
        } finally {
            setIsLoadingSwitch(false);
        }
    };

    // Get display name and icon for business type
    const getBusinessTypeIcon = (type: string) => {
        switch (type) {
            case "standalone_shop":
                return "🏪";
            case "franchise_admin":
                return "🏢";
            case "franchise_unit":
                return "🏬";
            default:
                return "📱";
        }
    };

    const getBusinessTypeLabel = (type: string) => {
        switch (type) {
            case "standalone_shop":
                return "Shop";
            case "franchise_admin":
                return "Admin";
            case "franchise_unit":
                return "Franchise";
            default:
                return "Business";
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    className="w-full justify-between gap-2 border-gray-300"
                >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Store className="w-4 h-4 text-gray-600 flex-shrink-0" />
                        <div className="min-w-0 flex-1 text-left">
                            <div className="text-sm font-semibold text-gray-900 truncate">
                                {activeBusinessAccount.display_name || activeBusinessAccount.business_name}
                            </div>
                            <div className="text-xs text-gray-500">
                                {getBusinessTypeLabel(activeBusinessAccount.business_type)}
                            </div>
                        </div>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-72" align="start">
                <DropdownMenuLabel className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                    My Accounts
                </DropdownMenuLabel>

                <div className="max-h-96 overflow-y-auto">
                    {businessAccounts.map((account) => (
                        <DropdownMenuItem
                            key={account.id}
                            onClick={() => handleSwitch(account.id)}
                            disabled={isLoadingSwitch}
                            className="flex items-center justify-between gap-2 px-3 py-2.5 cursor-pointer rounded-md hover:bg-gray-100"
                        >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span className="text-lg flex-shrink-0">
                                    {getBusinessTypeIcon(account.business_type)}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="text-sm font-medium text-gray-900 truncate">
                                        {account.display_name || account.business_name}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {getBusinessTypeLabel(account.business_type)}
                                    </div>
                                </div>
                            </div>
                            {account.id === activeBusinessAccount.id && (
                                <Check className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                            )}
                        </DropdownMenuItem>
                    ))}
                </div>

                {businessAccounts.length > 0 && <DropdownMenuSeparator className="my-2" />}

                <DropdownMenuItem
                    onClick={() => {
                        // Will be handled by separate setup modal/page
                        // For now, just show a toast
                        toast.info("Business setup feature coming soon");
                    }}
                    className="flex items-center gap-2 px-3 py-2.5 cursor-pointer rounded-md hover:bg-indigo-50 text-indigo-600"
                >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm font-medium">Add Business Account</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
