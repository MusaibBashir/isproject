import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth, Franchise } from "../../context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { PageContainer } from "../../components/layout/PageContainer";
import {
    Store, Plus, MapPin, Mail, Lock, User, Eye, EyeOff,
    ToggleLeft, ToggleRight, Search, ArrowLeft
} from "lucide-react";
import { toast } from "sonner";

const REGIONS = ["North India", "South India", "East India", "West India", "Central India"];
const STATE_MAP: Record<string, string[]> = {
    "North India": ["Delhi", "Punjab", "Haryana", "Uttar Pradesh", "Himachal Pradesh"],
    "South India": ["Karnataka", "Tamil Nadu", "Kerala", "Telangana", "Andhra Pradesh"],
    "East India": ["West Bengal", "Odisha", "Bihar", "Jharkhand", "Assam"],
    "West India": ["Maharashtra", "Gujarat", "Rajasthan", "Goa", "Madhya Pradesh"],
    "Central India": ["Chhattisgarh", "Madhya Pradesh", "Uttarakhand", "Jammu and Kashmir", "Tripura"],
};

export function ManageFranchisesPage() {
    const { getAllFranchises, createFranchiseUser, updateFranchise } = useAuth();
    const [franchises, setFranchises] = useState<Franchise[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Create form state
    const [newEmail, setNewEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [newName, setNewName] = useState("");
    const [franchiseName, setFranchiseName] = useState("");
    const [selectedRegion, setSelectedRegion] = useState("");
    const [selectedState, setSelectedState] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    const loadFranchises = async () => {
        const data = await getAllFranchises();
        setFranchises(data);
        setIsLoading(false);
    };

    useEffect(() => {
        loadFranchises();
    }, []);

    const handleCreate = async (e: any) => {
        e.preventDefault();

        if (!newEmail || !newPassword || !newName || !franchiseName || !selectedRegion || !selectedState) {
            toast.error("Please fill all fields");
            return;
        }

        if (newPassword.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }

        setIsCreating(true);
        const { error, franchise } = await createFranchiseUser(
            newEmail, newPassword, newName, franchiseName, selectedRegion, selectedState
        );

        if (error) {
            toast.error(error);
        } else {
            toast.success(`Franchise "${franchiseName}" created successfully!`);
            // Reset form
            setNewEmail("");
            setNewPassword("");
            setNewName("");
            setFranchiseName("");
            setSelectedRegion("");
            setSelectedState("");
            setShowCreateForm(false);
            await loadFranchises();
        }
        setIsCreating(false);
    };

    const handleToggleActive = async (franchise: Franchise) => {
        const success = await updateFranchise(franchise.id, { is_active: !franchise.is_active });
        if (success) {
            toast.success(`Franchise ${franchise.is_active ? "deactivated" : "activated"}`);
            await loadFranchises();
        } else {
            toast.error("Failed to update franchise");
        }
    };

    const filteredFranchises = franchises.filter((f: Franchise) =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.region.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.state.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <PageContainer title="Manage Franchises" subtitle="Create and manage franchise accounts">
            <div className="space-y-6">
                {/* Toolbar */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link to="/admin">
                            <Button variant="ghost" size="sm" className="gap-1">
                                <ArrowLeft className="w-4 h-4" /> Back
                            </Button>
                        </Link>
                        <div className="relative w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                value={searchQuery}
                                onChange={(e: any) => setSearchQuery(e.target.value)}
                                placeholder="Search franchises..."
                                className="pl-10"
                            />
                        </div>
                    </div>
                    <Button
                        onClick={() => setShowCreateForm(!showCreateForm)}
                        className="gap-2 bg-gray-900 hover:bg-gray-800"
                    >
                        <Plus className="w-4 h-4" />
                        Create Franchise
                    </Button>
                </div>

                {/* Create Form */}
                {showCreateForm && (
                    <Card className="border-2 border-blue-200 bg-blue-50/30">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Store className="w-5 h-5 text-blue-600" />
                                New Franchise
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleCreate} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    {/* Franchise Details */}
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Franchise Details</h3>
                                        <div className="space-y-2">
                                            <Label>Franchise Name *</Label>
                                            <Input
                                                value={franchiseName}
                                                onChange={(e: any) => setFranchiseName(e.target.value)}
                                                placeholder="e.g. Mumbai Central Store"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-2">
                                                <Label>Region *</Label>
                                                <select
                                                    value={selectedRegion}
                                                    onChange={(e: any) => {
                                                        setSelectedRegion(e.target.value);
                                                        setSelectedState("");
                                                    }}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                                                >
                                                    <option value="">Select region</option>
                                                    {REGIONS.map((r: string) => (
                                                        <option key={r} value={r}>{r}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>State *</Label>
                                                <select
                                                    value={selectedState}
                                                    onChange={(e: any) => setSelectedState(e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                                                    disabled={!selectedRegion}
                                                >
                                                    <option value="">Select state</option>
                                                    {(STATE_MAP[selectedRegion] || []).map((s: string) => (
                                                        <option key={s} value={s}>{s}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Owner Credentials */}
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Owner Credentials</h3>
                                        <div className="space-y-2">
                                            <Label>Owner Name *</Label>
                                            <div className="relative">
                                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <Input
                                                    value={newName}
                                                    onChange={(e: any) => setNewName(e.target.value)}
                                                    placeholder="Full name"
                                                    className="pl-10"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Email *</Label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <Input
                                                    type="email"
                                                    value={newEmail}
                                                    onChange={(e: any) => setNewEmail(e.target.value)}
                                                    placeholder="franchise@example.com"
                                                    className="pl-10"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Password *</Label>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <Input
                                                    type={showPassword ? "text" : "password"}
                                                    value={newPassword}
                                                    onChange={(e: any) => setNewPassword(e.target.value)}
                                                    placeholder="Min 6 characters"
                                                    className="pl-10 pr-10"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                >
                                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 justify-end pt-2">
                                    <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={isCreating} className="gap-2 bg-gray-900">
                                        {isCreating ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Creating...
                                            </>
                                        ) : (
                                            <>
                                                <Plus className="w-4 h-4" />
                                                Create Franchise
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {/* Franchises List */}
                <Card className="border border-gray-200 shadow-sm bg-white">
                    <CardContent className="p-0">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-16">
                                <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
                            </div>
                        ) : filteredFranchises.length === 0 ? (
                            <div className="text-center py-16">
                                <Store className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                                <p className="text-lg font-medium text-gray-500">
                                    {searchQuery ? "No franchises match your search" : "No franchises yet"}
                                </p>
                                {!searchQuery && (
                                    <p className="text-sm text-gray-400 mt-1">Create your first franchise to get started</p>
                                )}
                            </div>
                        ) : (
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-200 bg-gray-50">
                                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Franchise</th>
                                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Region</th>
                                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">State</th>
                                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Status</th>
                                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Created</th>
                                        <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredFranchises.map((f: Franchise) => (
                                        <tr key={f.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
                                                        <Store className="w-4 h-4 text-gray-600" />
                                                    </div>
                                                    <p className="text-sm font-medium text-gray-900">{f.name}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-gray-600 flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" /> {f.region}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-gray-600">{f.state}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${f.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                                    }`}>
                                                    {f.is_active ? "Active" : "Inactive"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-gray-500">
                                                    {new Date(f.created_at).toLocaleDateString()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Link to={`/admin/franchise/${f.id}`}>
                                                        <Button variant="ghost" size="sm" className="text-xs">
                                                            View Details
                                                        </Button>
                                                    </Link>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleToggleActive(f)}
                                                        className={`text-xs gap-1 ${f.is_active ? "text-red-600 hover:text-red-700" : "text-green-600 hover:text-green-700"}`}
                                                    >
                                                        {f.is_active ? (
                                                            <><ToggleRight className="w-4 h-4" /> Deactivate</>
                                                        ) : (
                                                            <><ToggleLeft className="w-4 h-4" /> Activate</>
                                                        )}
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </PageContainer>
    );
}
