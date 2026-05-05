"use client";

import { useState } from "react";
import { ActionButton, InputGroup, StatusBadge } from "@/components/ops-ui";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { ticketsApi, type Customer, type Bike, type BikeBlueprint } from "@/lib/tickets-api";

export function CreateTicketModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Step 1: Customer
  const [searchQuery, setSearchQuery] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "" });

  // Step 2: Bike
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [selectedBike, setSelectedBike] = useState<Bike | null>(null);
  const [isCreatingBike, setIsCreatingBike] = useState(false);
  const [blueprintSearchQuery, setBlueprintSearchQuery] = useState("");
  const [blueprints, setBlueprints] = useState<BikeBlueprint[]>([]);
  const [selectedBlueprint, setSelectedBlueprint] = useState<BikeBlueprint | null>(null);
  const [newBikeDetails, setNewBikeDetails] = useState({
    vin: "",
    mileage: "",
    image: "",
    image_public_id: "",
  });

  // Step 3: Ticket Details
  const [notes, setNotes] = useState("");

  const searchCustomers = async () => {
    if (!searchQuery.trim()) return;
    try {
      setLoading(true);
      setError("");
      const data = await ticketsApi.searchCustomers(searchQuery);
      setCustomers(data);
      if (data.length === 0) setError("No customers found matching that search.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to search customers");
    } finally {
      setLoading(false);
    }
  };

  const searchBlueprints = async () => {
    if (!blueprintSearchQuery.trim()) return;
    try {
      setLoading(true);
      setError("");
      const data = await ticketsApi.searchBlueprints(blueprintSearchQuery);
      setBlueprints(data);
      if (data.length === 0) setError("No bike models found.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to search blueprints");
    } finally {
      setLoading(false);
    }
  };

  const loadBikes = async (customerId: number) => {
    try {
      setLoading(true);
      const data = await ticketsApi.getCustomerBikes(customerId);
      setBikes(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load bikes");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomer = async () => {
    if (!newCustomer.name || !newCustomer.phone) return;
    try {
      setLoading(true);
      const cust = await ticketsApi.createCustomer(newCustomer);
      setSelectedCustomer(cust);
      setIsCreatingCustomer(false);
      setStep(2);
      loadBikes(cust.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create customer");
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerNext = () => {
    if (!selectedCustomer) return;
    setStep(2);
    loadBikes(selectedCustomer.id);
  };

  const handleCreateBike = async () => {
    if (!selectedCustomer || !selectedBlueprint) return;
    try {
      setLoading(true);
      const bike = await ticketsApi.createBike({
        customer_id: selectedCustomer.id,
        bike_blueprint_id: selectedBlueprint.id,
        image: newBikeDetails.image || undefined,
        image_public_id: newBikeDetails.image_public_id || undefined,
        vin: newBikeDetails.vin,
        mileage: Number(newBikeDetails.mileage) || 0,
      });
      setSelectedBike(bike);
      setIsCreatingBike(false);
      setStep(3);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create bike");
    } finally {
      setLoading(false);
    }
  };

  const handleBikeNext = () => {
    if (!selectedBike) return;
    setStep(3);
  };

  const handleCreateTicket = async () => {
    if (!selectedCustomer || !selectedBike) return;
    try {
      setLoading(true);
      await ticketsApi.createTicket({
        customer_id: selectedCustomer.id,
        customer_bike_id: selectedBike.id,
        notes,
      });
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to open ticket");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-300">
      <div className="w-full max-w-xl rounded-[2.5rem] bg-surface p-8 shadow-2xl border border-outline-variant/20 max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-on-surface tracking-tight">Open New Ticket</h2>
            <div className="mt-2 flex gap-1">
              {[1, 2, 3].map((s) => (
                <div 
                  key={s} 
                  className={`h-1.5 w-12 rounded-full transition-all duration-500 ${step >= s ? "bg-primary" : "bg-outline-variant/30"}`} 
                />
              ))}
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface transition-all"
          >
            &times;
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl bg-error/10 p-4 text-sm text-error border border-error/20 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <span className="h-2 w-2 rounded-full bg-error" />
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {step === 1 && (
            <div className="flex flex-col gap-6 animate-in slide-in-from-right-4 duration-300">
              <div className="flex flex-col gap-2">
                <h3 className="text-lg font-bold text-on-surface">Who is the customer?</h3>
                <p className="text-sm text-on-surface-variant">Search by name or phone, or create a new profile.</p>
              </div>

              {!isCreatingCustomer ? (
                <>
                  <div className="flex gap-2">
                    <input
                      autoFocus
                      type="text"
                      className="flex-1 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest px-5 py-3 text-on-surface outline-none focus:border-primary transition-all shadow-inner"
                      placeholder="Search name or phone..."
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setError(""); }}
                      onKeyDown={(e) => e.key === "Enter" && searchCustomers()}
                    />
                    <ActionButton tone="primary" onClick={searchCustomers} disabled={loading}>
                      {loading ? "..." : "Search"}
                    </ActionButton>
                  </div>
                  
                  {customers.length > 0 && (
                    <div className="max-h-60 overflow-y-auto rounded-[1.5rem] border border-outline-variant/10 bg-surface-container-lowest p-2 shadow-sm">
                      {customers.map((c) => (
                        <div
                          key={c.id}
                          className={`group cursor-pointer rounded-xl p-4 transition-all hover:bg-primary/5 ${selectedCustomer?.id === c.id ? "bg-primary/10 border-primary/20 ring-1 ring-primary/20" : "border-transparent"}`}
                          onClick={() => setSelectedCustomer(c)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className={`font-bold ${selectedCustomer?.id === c.id ? "text-primary" : "text-on-surface"}`}>{c.name}</p>
                              <p className="text-sm text-on-surface-variant">{c.phone}</p>
                            </div>
                            {selectedCustomer?.id === c.id && <span className="text-primary text-xl">✓</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between items-center mt-4">
                    <button type="button" className="text-sm font-bold text-primary hover:underline px-2 py-1" onClick={() => setIsCreatingCustomer(true)}>
                      + Create New Customer
                    </button>
                    <ActionButton tone="primary" className="px-8" disabled={!selectedCustomer} onClick={handleCustomerNext}>
                      Next Step
                    </ActionButton>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-5 p-6 rounded-[1.5rem] bg-surface-container-low border border-outline-variant/10">
                  <InputGroup label="Full Name">
                    <input
                      autoFocus
                      type="text"
                      className="w-full rounded-xl border border-outline-variant/30 bg-surface px-4 py-2 outline-none focus:border-primary transition-all"
                      value={newCustomer.name}
                      onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    />
                  </InputGroup>
                  <InputGroup label="Phone Number">
                    <input
                      type="text"
                      className="w-full rounded-xl border border-outline-variant/30 bg-surface px-4 py-2 outline-none focus:border-primary transition-all"
                      value={newCustomer.phone}
                      onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    />
                  </InputGroup>
                  <div className="flex justify-end gap-3 mt-2">
                    <ActionButton variant="ghost" onClick={() => setIsCreatingCustomer(false)}>Cancel</ActionButton>
                    <ActionButton tone="primary" onClick={handleCreateCustomer} disabled={loading || !newCustomer.name || !newCustomer.phone}>
                      {loading ? "Creating..." : "Save & Continue"}
                    </ActionButton>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-6 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between border-b border-outline-variant/10 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-on-surface">Select Bike</h3>
                  <p className="text-sm text-on-surface-variant">Belonging to {selectedCustomer?.name}</p>
                </div>
                <StatusBadge tone="primary">Step 2 of 3</StatusBadge>
              </div>

              {!isCreatingBike ? (
                <>
                  {bikes.length > 0 ? (
                    <div className="grid gap-3">
                      {bikes.map((b) => (
                        <div
                          key={b.id}
                          className={`cursor-pointer rounded-2xl border p-5 transition-all hover:shadow-md ${selectedBike?.id === b.id ? "bg-primary/5 border-primary ring-1 ring-primary/20" : "bg-surface border-outline-variant/20"}`}
                          onClick={() => setSelectedBike(b)}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                              {b.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={b.image}
                                  alt=""
                                  className="h-12 w-12 flex-none rounded-xl object-cover"
                                />
                              ) : null}
                              <div className="min-w-0">
                              <p className="font-black text-on-surface">
                                {b.bike_blueprint?.brand?.name || "Unknown"} {b.bike_blueprint?.model || "Unknown"}
                              </p>
                              <p className="text-xs text-on-surface-variant font-mono mt-1">VIN: {b.vin || "N/A"} | Year: {b.bike_blueprint?.year || "N/A"}</p>
                              </div>
                            </div>
                            <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedBike?.id === b.id ? "bg-primary border-primary" : "border-outline-variant"}`}>
                              {selectedBike?.id === b.id && <span className="text-white text-xs">✓</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-10 text-center rounded-[2rem] bg-surface-container-low border border-dashed border-outline-variant/30">
                      <p className="text-on-surface-variant font-medium">No bikes found for this customer.</p>
                      <button type="button" className="mt-4 text-sm font-bold text-primary hover:underline" onClick={() => setIsCreatingBike(true)}>
                        Register a New Bike
                      </button>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center mt-4">
                    <button type="button" className="text-sm font-bold text-primary hover:underline px-2" onClick={() => setIsCreatingBike(true)}>
                      + Register Different Bike
                    </button>
                    <div className="flex gap-2">
                      <ActionButton variant="ghost" onClick={() => setStep(1)}>Back</ActionButton>
                      <ActionButton tone="primary" className="px-8" disabled={!selectedBike} onClick={handleBikeNext}>
                        Next Step
                      </ActionButton>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-5 p-6 rounded-[1.5rem] bg-surface-container-low border border-outline-variant/10">
                  <InputGroup label="Find Model (Blueprint)">
                    <div className="flex gap-2">
                      <input
                        autoFocus
                        type="text"
                        className="flex-1 rounded-xl border border-outline-variant/30 bg-surface px-4 py-2 text-on-surface outline-none focus:border-primary transition-all"
                        placeholder="Search model (e.g. R1, CBR)..."
                        value={blueprintSearchQuery}
                        onChange={(e) => setBlueprintSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && searchBlueprints()}
                      />
                      <ActionButton onClick={searchBlueprints} disabled={loading}>Find</ActionButton>
                    </div>
                    {blueprints.length > 0 && (
                      <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-outline-variant/10 bg-surface shadow-sm">
                        {blueprints.map((bp) => (
                          <div
                            key={bp.id}
                            className={`cursor-pointer p-3 text-sm transition-all hover:bg-primary/5 ${selectedBlueprint?.id === bp.id ? "bg-primary/10 font-bold text-primary" : "text-on-surface"}`}
                            onClick={() => setSelectedBlueprint(bp)}
                          >
                            {bp.brand?.name} {bp.model} ({bp.year})
                          </div>
                        ))}
                      </div>
                    )}
                  </InputGroup>
                  <div className="grid grid-cols-2 gap-4">
                    <InputGroup label="VIN Number">
                      <input
                        type="text"
                        className="w-full rounded-xl border border-outline-variant/30 bg-surface px-4 py-2 outline-none focus:border-primary"
                        placeholder="Serial/VIN"
                        value={newBikeDetails.vin}
                        onChange={(e) => setNewBikeDetails({ ...newBikeDetails, vin: e.target.value })}
                      />
                    </InputGroup>
                    <InputGroup label="Mileage (km)">
                      <input
                        type="number"
                        className="w-full rounded-xl border border-outline-variant/30 bg-surface px-4 py-2 outline-none focus:border-primary"
                        value={newBikeDetails.mileage}
                        onChange={(e) => setNewBikeDetails({ ...newBikeDetails, mileage: e.target.value })}
                      />
                    </InputGroup>
                  </div>
                  <ImageUpload
                    value={newBikeDetails.image || undefined}
                    folder="Customer Bike Photo"
                    uploadFolder="rpg-system/Customer-Bike"
                    onChange={(url, publicId) =>
                      setNewBikeDetails((current) => ({
                        ...current,
                        image: url,
                        image_public_id: publicId,
                      }))
                    }
                    onError={setError}
                  />
                  <div className="flex justify-end gap-3 mt-2">
                    <ActionButton variant="ghost" onClick={() => setIsCreatingBike(false)}>Cancel</ActionButton>
                    <ActionButton tone="primary" onClick={handleCreateBike} disabled={loading || !selectedBlueprint}>
                      {loading ? "Saving..." : "Register & Continue"}
                    </ActionButton>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-6 animate-in slide-in-from-right-4 duration-300">
              <div className="rounded-[2rem] bg-primary/5 p-6 border border-primary/10">
                <h3 className="text-lg font-bold text-primary mb-4">Summary</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-on-surface-variant font-medium">Customer</p>
                    <p className="font-bold text-on-surface">{selectedCustomer?.name}</p>
                  </div>
                  <div>
                    <p className="text-on-surface-variant font-medium">Bike</p>
                    <p className="font-bold text-on-surface">
                      {selectedBike?.bike_blueprint?.brand?.name} {selectedBike?.bike_blueprint?.model}
                    </p>
                  </div>
                </div>
              </div>

              <InputGroup label="Issue Description / Technical Notes">
                <textarea
                  autoFocus
                  className="w-full rounded-[1.5rem] border border-outline-variant/30 bg-surface-container-lowest px-5 py-4 min-h-[120px] outline-none focus:border-primary transition-all shadow-inner"
                  placeholder="Describe the problem or service requested by the customer..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </InputGroup>

              <div className="flex justify-between items-center mt-4">
                <ActionButton variant="ghost" onClick={() => setStep(2)}>Back to Bike</ActionButton>
                <ActionButton tone="primary" className="px-12 py-4 text-lg font-black" onClick={handleCreateTicket} disabled={loading}>
                  {loading ? "Opening Ticket..." : "OPEN MAINTENANCE TICKET"}
                </ActionButton>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
