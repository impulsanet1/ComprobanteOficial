/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from "react";
import { User, onAuthStateChanged, signOut, sendPasswordResetEmail, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { BusinessConfig, SocialNetwork, Service, Receipt, Client, ReceiptItem } from "../types";
import { DEFAULT_BUSINESS_CONFIG, DEFAULT_SOCIAL_NETWORKS, DEFAULT_SERVICES } from "../defaultData";

interface AppContextType {
  user: User | null;
  loadingAuth: boolean;
  loadingData: boolean;
  businessConfig: BusinessConfig;
  socialNetworks: SocialNetwork[];
  services: Service[];
  receipts: Receipt[];
  clients: Client[];
  
  // Auth actions
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  
  // Settings actions
  updateBusinessConfig: (config: Partial<BusinessConfig>) => Promise<void>;
  
  // Social Networks actions
  addSocialNetwork: (sn: SocialNetwork) => Promise<void>;
  updateSocialNetwork: (sn: SocialNetwork) => Promise<void>;
  deleteSocialNetwork: (id: string) => Promise<void>;
  
  // Services actions
  addService: (service: Service) => Promise<void>;
  updateService: (service: Service) => Promise<void>;
  deleteService: (id: string) => Promise<void>;
  
  // Receipts actions
  createReceipt: (receiptData: Omit<Receipt, "id" | "consecutive">) => Promise<Receipt>;
  deleteReceipt: (id: string) => Promise<void>;
  updateReceipt: (id: string, updatedData: Partial<Receipt>) => Promise<void>;
  updateClientTag: (clientId: string, tag: string) => Promise<void>;
  
  // System Maintenance
  restoreDefaults: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingData, setLoadingData] = useState(true);

  const [businessConfig, setBusinessConfig] = useState<BusinessConfig>(DEFAULT_BUSINESS_CONFIG);
  const [socialNetworks, setSocialNetworks] = useState<SocialNetwork[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  // 1. Listen to Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
    });
    return unsubscribe;
  }, []);

  // 2. Listen & Sync Firestore Data when Logged In
  useEffect(() => {
    if (!user) {
      setLoadingData(false);
      return;
    }

    setLoadingData(true);

    // Sync business config
    const configRef = doc(db, "config", "business");
    const unsubConfig = onSnapshot(configRef, async (docSnap) => {
      if (docSnap.exists()) {
        const configData = docSnap.data() as BusinessConfig;
        setBusinessConfig(configData);

        // One-time migration for existing databases to seed Facebook and its services
        if (!configData.facebookSeeded) {
          console.log("Migration: Seeding Facebook and its services...");
          try {
            // 1. Seed Facebook social network if missing
            const fbNetRef = doc(db, "social_networks", "facebook");
            const fbNetSnap = await getDoc(fbNetRef);
            if (!fbNetSnap.exists()) {
              await setDoc(fbNetRef, {
                name: "Facebook",
                icon: "Facebook"
              });
            }

            // 2. Seed Facebook services if missing
            const fbServices = DEFAULT_SERVICES.filter((s) => s.socialNetworkId === "facebook");
            for (const srv of fbServices) {
              const srvRef = doc(db, "services", srv.id);
              const srvSnap = await getDoc(srvRef);
              if (!srvSnap.exists()) {
                await setDoc(srvRef, {
                  socialNetworkId: srv.socialNetworkId,
                  name: srv.name,
                  quantities: srv.quantities
                });
              }
            }

            // 3. Mark as seeded in the business configuration doc
            await updateDoc(configRef, { facebookSeeded: true });
          } catch (migError) {
            console.error("Failed to migrate/seed Facebook:", migError);
          }
        }

        // Self-healing / Migration: If the existing WhatsApp is not the Colombian one,
        // we automatically upgrade/reseed the services and business configurations.
        if (configData.whatsapp !== "573208354198") {
          console.log("Upgrading database schema for Colombian Pesos and Whatsapp...");
          await setDoc(configRef, { ...DEFAULT_BUSINESS_CONFIG, facebookSeeded: true });

          // Re-initialize default social networks
          const socialQuery = await getDocs(collection(db, "social_networks"));
          for (const sDoc of socialQuery.docs) {
            await deleteDoc(doc(db, "social_networks", sDoc.id));
          }
          for (const sn of DEFAULT_SOCIAL_NETWORKS) {
            await setDoc(doc(db, "social_networks", sn.id), {
              name: sn.name,
              icon: sn.icon
            });
          }

          // Re-initialize default services
          const servicesQuery = await getDocs(collection(db, "services"));
          for (const sDoc of servicesQuery.docs) {
            await deleteDoc(doc(db, "services", sDoc.id));
          }
          for (const srv of DEFAULT_SERVICES) {
            await setDoc(doc(db, "services", srv.id), {
              socialNetworkId: srv.socialNetworkId,
              name: srv.name,
              quantities: srv.quantities
            });
          }
        }
      } else {
        // First run initialization
        const initialConfig = { ...DEFAULT_BUSINESS_CONFIG, facebookSeeded: true };
        await setDoc(configRef, initialConfig);
        setBusinessConfig(initialConfig);
      }
    });

    // Sync social networks
    const socialNetworksRef = collection(db, "social_networks");
    const unsubSocial = onSnapshot(socialNetworksRef, async (querySnap) => {
      if (!querySnap.empty) {
        const sns: SocialNetwork[] = [];
        querySnap.forEach((doc) => {
          sns.push({ id: doc.id, ...doc.data() } as SocialNetwork);
        });
        setSocialNetworks(sns);
      } else {
        // Initialize default social networks
        for (const sn of DEFAULT_SOCIAL_NETWORKS) {
          await setDoc(doc(db, "social_networks", sn.id), {
            name: sn.name,
            icon: sn.icon
          });
        }
      }
    });

    // Sync services
    const servicesRef = collection(db, "services");
    const unsubServices = onSnapshot(servicesRef, async (querySnap) => {
      if (!querySnap.empty) {
        const srvs: Service[] = [];
        let hasUSD = false;
        querySnap.forEach((doc) => {
          const data = doc.data() as Service;
          srvs.push({ id: doc.id, ...data } as Service);
          if (data.quantities && data.quantities.some(q => q.suggestedPrice > 0 && q.suggestedPrice < 300)) {
            hasUSD = true;
          }
        });
        
        if (hasUSD) {
          console.log("USD values detected in services. Self-healing / Reseeding to Colombian Pesos defaults...");
          for (const sDoc of querySnap.docs) {
            await deleteDoc(doc(db, "services", sDoc.id));
          }
          for (const srv of DEFAULT_SERVICES) {
            await setDoc(doc(db, "services", srv.id), {
              socialNetworkId: srv.socialNetworkId,
              name: srv.name,
              quantities: srv.quantities
            });
          }
        } else {
          setServices(srvs);
        }
      } else {
        // Initialize default services
        for (const srv of DEFAULT_SERVICES) {
          await setDoc(doc(db, "services", srv.id), {
            socialNetworkId: srv.socialNetworkId,
            name: srv.name,
            quantities: srv.quantities
          });
        }
      }
    });

    // Sync receipts (order by date descending in-memory to prevent Firestore index requirements)
    const receiptsRef = collection(db, "receipts");
    const unsubReceipts = onSnapshot(receiptsRef, (querySnap) => {
      const recs: Receipt[] = [];
      querySnap.forEach((doc) => {
        recs.push({ id: doc.id, ...doc.data() } as Receipt);
      });
      // Sort in memory by date descending safely
      recs.sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
      });
      setReceipts(recs);
    }, (error) => {
      console.error("Error syncing receipts snapshot:", error);
    });

    // Sync clients
    const clientsRef = collection(db, "clients");
    const unsubClients = onSnapshot(clientsRef, (querySnap) => {
      const cls: Client[] = [];
      querySnap.forEach((doc) => {
        cls.push({ id: doc.id, ...doc.data() } as Client);
      });
      setClients(cls);
      setLoadingData(false);
    });

    return () => {
      unsubConfig();
      unsubSocial();
      unsubServices();
      unsubReceipts();
      unsubClients();
    };
  }, [user]);

  // 3. Self-healing database cleanup of orphan client records
  useEffect(() => {
    if (!user || loadingData || clients.length === 0 || receipts.length === 0) return;

    const performClientCleanup = async () => {
      // Create a list of active clients based on unique combinations of clientName and clientPhone in receipts
      const activeKeys = new Set(
        receipts.map(r => `${r.clientName.trim().toLowerCase()}_${r.clientPhone.trim()}`)
      );

      for (const client of clients) {
        const clientKey = `${client.name.trim().toLowerCase()}_${client.phone.trim()}`;
        
        if (!activeKeys.has(clientKey)) {
          console.log(`Self-healing: Deleting client ${client.name} (${client.phone}) with 0 receipts from Firestore.`);
          try {
            await deleteDoc(doc(db, "clients", client.id));
          } catch (e) {
            console.error("Failed to self-heal orphan client doc:", e);
          }
        } else {
          // Client has receipts, check if the counts and totals match perfectly
          const matchingReceipts = receipts.filter(
            (r) =>
              r.clientName.trim().toLowerCase() === client.name.trim().toLowerCase() &&
              r.clientPhone.trim() === client.phone.trim()
          );

          const actualCount = matchingReceipts.length;
          const actualSpent = matchingReceipts.reduce((sum, r) => sum + (r.totalCharged || 0), 0);
          
          // Get the actual latest purchase date from receipts
          const sorted = [...matchingReceipts].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          );
          const actualLastDate = sorted.length > 0 ? sorted[0].date : client.lastPurchaseDate;

          if (
            client.purchaseCount !== actualCount ||
            client.totalSpent !== actualSpent ||
            client.lastPurchaseDate !== actualLastDate
          ) {
            console.log(`Self-healing: Syncing stats for client ${client.name} (Stored count: ${client.purchaseCount}, Actual: ${actualCount})`);
            try {
              await updateDoc(doc(db, "clients", client.id), {
                purchaseCount: actualCount,
                totalSpent: actualSpent,
                lastPurchaseDate: actualLastDate
              });
            } catch (e) {
              console.error("Failed to self-heal client stats:", e);
            }
          }
        }
      }
    };

    const timeoutId = setTimeout(() => {
      performClientCleanup();
    }, 4000); // 4 seconds debounce

    return () => clearTimeout(timeoutId);
  }, [user, loadingData, receipts, clients]);

  // Auth Operations
  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      // If it's a first time launch, let's automatically check if there are no registered users in authentication,
      // and if the credentials are the default ones, create the account. This is a robust fallback for sandboxed runtimes.
      if (
        (email === "admin@impulsanet.com" && password === "impulsa2026") ||
        (email === "sergioruizv04@gmail.com" && password === "sergio11")
      ) {
        const { createUserWithEmailAndPassword } = await import("firebase/auth");
        try {
          await createUserWithEmailAndPassword(auth, email, password);
          return;
        } catch (createErr) {
          // If creation fails (e.g. user already exists but password was changed), throw original error
          throw error;
        }
      }
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  // Settings Operations
  const updateBusinessConfig = async (config: Partial<BusinessConfig>) => {
    const configRef = doc(db, "config", "business");
    await updateDoc(configRef, config);
  };

  // Social Networks Operations
  const addSocialNetwork = async (sn: SocialNetwork) => {
    await setDoc(doc(db, "social_networks", sn.id), {
      name: sn.name,
      icon: sn.icon
    });
  };

  const updateSocialNetwork = async (sn: SocialNetwork) => {
    await updateDoc(doc(db, "social_networks", sn.id), {
      name: sn.name,
      icon: sn.icon
    });
  };

  const deleteSocialNetwork = async (id: string) => {
    // Delete social network doc
    await deleteDoc(doc(db, "social_networks", id));
    
    // Also delete associated services
    const associatedServices = services.filter((s) => s.socialNetworkId === id);
    for (const s of associatedServices) {
      await deleteService(s.id);
    }
  };

  // Services Operations
  const addService = async (service: Service) => {
    await setDoc(doc(db, "services", service.id), {
      socialNetworkId: service.socialNetworkId,
      name: service.name,
      quantities: service.quantities
    });
  };

  const updateService = async (service: Service) => {
    await updateDoc(doc(db, "services", service.id), {
      socialNetworkId: service.socialNetworkId,
      name: service.name,
      quantities: service.quantities
    });
  };

  const deleteService = async (id: string) => {
    await deleteDoc(doc(db, "services", id));
  };

  // Receipt & Client Generation
  const createReceipt = async (receiptData: Omit<Receipt, "id" | "consecutive">) => {
    // Calculate consecutive number: safely filter out invalid/NaN consecutives in existing receipts
    const validConsecutives = receipts
      .map((r) => Number(r.consecutive))
      .filter((num) => !isNaN(num) && isFinite(num));

    const nextConsecutive = validConsecutives.length > 0 
      ? Math.max(...validConsecutives) + 1 
      : 1001;

    // Create receipt document reference (with auto id)
    const receiptsRef = collection(db, "receipts");
    
    const finalReceipt = {
      ...receiptData,
      consecutive: nextConsecutive
    };

    const docRef = await addDoc(receiptsRef, finalReceipt);
    const receiptId = docRef.id;

    // Update or Create Client
    // Normalize client name + phone to find unique identifier
    const normalizedPhone = (receiptData.clientPhone || "").trim().replace(/\D/g, "");
    const clientId = `${receiptData.clientName.trim().toLowerCase().replace(/\s+/g, "-")}-${normalizedPhone || "no-phone"}`;
    const clientRef = doc(db, "clients", clientId);
    const clientSnap = await getDoc(clientRef);

    if (clientSnap.exists()) {
      const currentClient = clientSnap.data() as Client;
      await setDoc(clientRef, {
        ...currentClient,
        purchaseCount: (currentClient.purchaseCount || 0) + 1,
        totalSpent: (currentClient.totalSpent || 0) + receiptData.totalCharged,
        lastPurchaseDate: receiptData.date,
        receiptIds: [...(currentClient.receiptIds || []), receiptId]
      });
    } else {
      const newClient: Client = {
        id: clientId,
        name: receiptData.clientName.trim(),
        phone: receiptData.clientPhone.trim(),
        purchaseCount: 1,
        totalSpent: receiptData.totalCharged,
        lastPurchaseDate: receiptData.date,
        receiptIds: [receiptId]
      };
      await setDoc(clientRef, newClient);
    }

    return {
      ...finalReceipt,
      id: receiptId
    };
  };

  const deleteReceipt = async (id: string) => {
    // 1. Get receipt details
    const receiptDocRef = doc(db, "receipts", id);
    const receiptSnap = await getDoc(receiptDocRef);
    if (!receiptSnap.exists()) {
      // Just in case, try deleting and return
      await deleteDoc(receiptDocRef);
      return;
    }
    const receiptData = receiptSnap.data() as Receipt;

    // 2. Generate the client ID
    const normalizedPhone = (receiptData.clientPhone || "").trim().replace(/\D/g, "");
    const clientId = `${receiptData.clientName.trim().toLowerCase().replace(/\s+/g, "-")}-${normalizedPhone || "no-phone"}`;
    const clientRef = doc(db, "clients", clientId);
    const clientSnap = await getDoc(clientRef);

    if (clientSnap.exists()) {
      const clientData = clientSnap.data() as Client;
      
      // Filter out this receipt ID from client's receiptIds
      const updatedReceiptIds = (clientData.receiptIds || []).filter((rId) => rId !== id);
      const newPurchaseCount = Math.max(0, (clientData.purchaseCount || 1) - 1);
      
      if (updatedReceiptIds.length === 0 || newPurchaseCount <= 0 || (clientData.purchaseCount || 1) <= 1) {
        // Delete the client if no receipts are left or purchase count becomes 0
        await deleteDoc(clientRef);
      } else {
        // Otherwise, update client purchaseCount, totalSpent, and receiptIds
        const newTotalSpent = Math.max(0, (clientData.totalSpent || 0) - (receiptData.totalCharged || 0));
        
        // Find new lastPurchaseDate by looking up the remaining receipts of this client
        let lastPurchaseDate = clientData.lastPurchaseDate;
        const remainingClientReceipts = receipts.filter((r) => r.id !== id && r.clientName.trim().toLowerCase() === receiptData.clientName.trim().toLowerCase());
        if (remainingClientReceipts.length > 0) {
          remainingClientReceipts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          lastPurchaseDate = remainingClientReceipts[0].date;
        }

        await setDoc(clientRef, {
          ...clientData,
          purchaseCount: newPurchaseCount,
          totalSpent: newTotalSpent,
          receiptIds: updatedReceiptIds,
          lastPurchaseDate: lastPurchaseDate
        });
      }
    }

    // 3. Delete the receipt
    await deleteDoc(receiptDocRef);
  };

  const updateReceipt = async (id: string, updatedData: Partial<Receipt>) => {
    // 1. Get the current receipt before update
    const receiptDocRef = doc(db, "receipts", id);
    const receiptSnap = await getDoc(receiptDocRef);
    if (!receiptSnap.exists()) {
      await updateDoc(receiptDocRef, updatedData);
      return;
    }
    const oldReceipt = receiptSnap.data() as Receipt;

    // 2. Perform the update on the receipt
    await updateDoc(receiptDocRef, updatedData);

    // 3. Determine old and new client details
    const oldName = oldReceipt.clientName || "";
    const oldPhone = oldReceipt.clientPhone || "";
    const oldTotalCharged = oldReceipt.totalCharged || 0;

    const newName = updatedData.clientName !== undefined ? updatedData.clientName : oldName;
    const newPhone = updatedData.clientPhone !== undefined ? updatedData.clientPhone : oldPhone;
    const newTotalCharged = updatedData.totalCharged !== undefined ? updatedData.totalCharged : oldTotalCharged;

    const oldNormalizedPhone = oldPhone.trim().replace(/\D/g, "");
    const oldClientId = `${oldName.trim().toLowerCase().replace(/\s+/g, "-")}-${oldNormalizedPhone || "no-phone"}`;

    const newNormalizedPhone = newPhone.trim().replace(/\D/g, "");
    const newClientId = `${newName.trim().toLowerCase().replace(/\s+/g, "-")}-${newNormalizedPhone || "no-phone"}`;

    if (oldClientId === newClientId) {
      // Client did not change, but maybe totalCharged did!
      const clientRef = doc(db, "clients", oldClientId);
      const clientSnap = await getDoc(clientRef);
      if (clientSnap.exists()) {
        const clientData = clientSnap.data() as Client;
        const totalSpentDiff = newTotalCharged - oldTotalCharged;
        await setDoc(clientRef, {
          ...clientData,
          totalSpent: Math.max(0, (clientData.totalSpent || 0) + totalSpentDiff),
          lastPurchaseDate: updatedData.date || oldReceipt.date || clientData.lastPurchaseDate
        });
      }
    } else {
      // Client changed! We need to subtract from old client and add to new client.
      
      // Adjust old client
      const oldClientRef = doc(db, "clients", oldClientId);
      const oldClientSnap = await getDoc(oldClientRef);
      if (oldClientSnap.exists()) {
        const oldClientData = oldClientSnap.data() as Client;
        const updatedReceiptIds = (oldClientData.receiptIds || []).filter((rId) => rId !== id);
        const newPurchaseCount = Math.max(0, (oldClientData.purchaseCount || 1) - 1);
        
        if (updatedReceiptIds.length === 0 || newPurchaseCount <= 0 || (oldClientData.purchaseCount || 1) <= 1) {
          await deleteDoc(oldClientRef);
        } else {
          const newTotalSpent = Math.max(0, (oldClientData.totalSpent || 0) - oldTotalCharged);
          await setDoc(oldClientRef, {
            ...oldClientData,
            purchaseCount: newPurchaseCount,
            totalSpent: newTotalSpent,
            receiptIds: updatedReceiptIds
          });
        }
      }

      // Add to new client
      const newClientRef = doc(db, "clients", newClientId);
      const newClientSnap = await getDoc(newClientRef);
      const finalDate = updatedData.date || oldReceipt.date;
      if (newClientSnap.exists()) {
        const newClientData = newClientSnap.data() as Client;
        await setDoc(newClientRef, {
          ...newClientData,
          purchaseCount: (newClientData.purchaseCount || 0) + 1,
          totalSpent: (newClientData.totalSpent || 0) + newTotalCharged,
          lastPurchaseDate: finalDate,
          receiptIds: [...(newClientData.receiptIds || []).filter((rId) => rId !== id), id]
        });
      } else {
        const newClient: Client = {
          id: newClientId,
          name: newName.trim(),
          phone: newPhone.trim(),
          purchaseCount: 1,
          totalSpent: newTotalCharged,
          lastPurchaseDate: finalDate,
          receiptIds: [id]
        };
        await setDoc(newClientRef, newClient);
      }
    }
  };

  const updateClientTag = async (clientId: string, tag: string) => {
    const clientRef = doc(db, "clients", clientId);
    await updateDoc(clientRef, { tag });
  };

  const restoreDefaults = async () => {
    // Re-initialize default social networks
    const socialQuery = await getDocs(collection(db, "social_networks"));
    for (const sDoc of socialQuery.docs) {
      await deleteDoc(doc(db, "social_networks", sDoc.id));
    }
    for (const sn of DEFAULT_SOCIAL_NETWORKS) {
      await setDoc(doc(db, "social_networks", sn.id), {
        name: sn.name,
        icon: sn.icon
      });
    }

    // Re-initialize default services
    const servicesQuery = await getDocs(collection(db, "services"));
    for (const sDoc of servicesQuery.docs) {
      await deleteDoc(doc(db, "services", sDoc.id));
    }
    for (const srv of DEFAULT_SERVICES) {
      await setDoc(doc(db, "services", srv.id), {
        socialNetworkId: srv.socialNetworkId,
        name: srv.name,
        quantities: srv.quantities
      });
    }

    // Reset config
    const configRef = doc(db, "config", "business");
    const initialConfig = { ...DEFAULT_BUSINESS_CONFIG, facebookSeeded: true };
    await setDoc(configRef, initialConfig);
    setBusinessConfig(initialConfig);
  };

  return (
    <AppContext.Provider
      value={{
        user,
        loadingAuth,
        loadingData,
        businessConfig,
        socialNetworks,
        services,
        receipts,
        clients,
        login,
        loginWithGoogle,
        logout,
        resetPassword,
        updateBusinessConfig,
        addSocialNetwork,
        updateSocialNetwork,
        deleteSocialNetwork,
        addService,
        updateService,
        deleteService,
        createReceipt,
        deleteReceipt,
        updateReceipt,
        updateClientTag,
        restoreDefaults
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
