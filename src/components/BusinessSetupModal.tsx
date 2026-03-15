import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "./ui/select";
import { toast } from "sonner";
import { Loader } from "lucide-react";

interface BusinessSetupModalProps {
    onComplete?: (accountId: string) => void;
    isOpen?: boolean;
    onClose?: () => void;
}

type BusinessType = "standalone_shop" | "franchise_admin" | "franchise_unit" | "restaurant";

export function BusinessSetupModal({ onComplete, isOpen = true, onClose }: BusinessSetupModalProps) {
    const { createBusinessAccount, profile } = useAuth();
    const [step, setStep] = useState<"type" | "details">("type");
    const [businessType, setBusinessType] = useState<BusinessType | "">("");
    const [businessName, setBusinessName] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const businessTypeOptions = [
        {
            id: "standalone_shop",
            label: "🏪 Standalone Shop",
            description: "Single independent shop - you operate everything",
            details: "No franchises, you manage all operations directly",
        },
        {
            id: "franchise_admin",
            label: "🏢 Franchise Admin",
            description: "Manage multiple franchise locations",
            details: "Create and manage multiple franchises from a central admin",
        },
        {
            id: "franchise_unit",
            label: "🏬 Franchise Unit",
            description: "Run a single franchise location",
            details: "You are an operator under a franchise agreement",
        },
        {
            id: "restaurant",
            label: "🍽️ Restaurant",
            description: "Restaurant with kitchen display system",
            details: "Token-based orders, kitchen workflow, order tracking",
        },
    ];

    const handleTypeSelect = (type: BusinessType) => {
        setBusinessType(type);
        setStep("details");
    };

    const handleCreateAccount = async () => {
        if (!businessName.trim() || !businessType) {
            toast.error("Please fill in all fields");
            return;
        }

        setIsLoading(true);
        try {
            const { error, account } = await createBusinessAccount(businessName, businessType);
            if (error) {
                toast.error(error);
            } else if (account) {
                toast.success("Business account created successfully!");
                setBusinessName("");
                onComplete?.(account.id);
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to create business account");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-2xl mx-4">
                {step === "type" ? (
                    <>
                        <CardHeader>
                            <CardTitle>Welcome, {profile?.full_name || "User"}!</CardTitle>
                            <p className="text-sm text-gray-600 mt-2">
                                Let's set up your business. Choose the model that best fits your needs.
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {businessTypeOptions.map((option) => (
                                    <button
                                        key={option.id}
                                        onClick={() => handleTypeSelect(option.id as BusinessType)}
                                        className="p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-600 hover:bg-indigo-50 transition-all text-left"
                                    >
                                        <div className="text-3xl mb-2">{option.label.split(" ")[0]}</div>
                                        <h3 className="font-semibold text-sm text-gray-900">{option.label}</h3>
                                        <p className="text-xs text-gray-600 mt-2">{option.description}</p>
                                        <p className="text-xs text-gray-500 mt-2 italic">{option.details}</p>
                                    </button>
                                ))}
                            </div>
                        </CardContent>
                    </>
                ) : (
                    <>
                        <CardHeader>
                            <CardTitle>
                                {businessTypeOptions.find((opt) => opt.id === businessType)?.label}
                            </CardTitle>
                            <p className="text-sm text-gray-600 mt-2">
                                Enter your business details below
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="business-name">Business Name</Label>
                                <Input
                                    id="business-name"
                                    placeholder="Enter your business name"
                                    value={businessName}
                                    onChange={(e) => setBusinessName(e.target.value)}
                                    disabled={isLoading}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="business-type">Business Type</Label>
                                <Select value={businessType} disabled>
                                    <SelectTrigger id="business-type">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {businessTypeOptions.map((opt) => (
                                            <SelectItem key={opt.id} value={opt.id}>
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                                <p className="text-sm text-blue-900">
                                    <strong>💡 Tip:</strong> You can create additional business accounts anytime from the account switcher in the sidebar.
                                </p>
                            </div>

                            <div className="flex gap-2 mt-6">
                                <Button
                                    variant="outline"
                                    onClick={() => setStep("type")}
                                    disabled={isLoading}
                                >
                                    Back
                                </Button>
                                <Button
                                    onClick={handleCreateAccount}
                                    disabled={isLoading || !businessName.trim()}
                                    className="ml-auto"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader className="w-4 h-4 mr-2 animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        "Create Account"
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </>
                )}
            </Card>
        </div>
    );
}
