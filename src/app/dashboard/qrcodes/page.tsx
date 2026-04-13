"use client";

import React, { useState } from "react";
import { useBusinessId } from "@/components/dashboard/shell";
import { Button, Card, EmptyState } from "@/components/ui";
import { generateQrCodeAction } from "@/actions/token";
import { QrCode, Download, Plus } from "lucide-react";

interface GeneratedQr {
  qrCodeId: string;
  url: string;
  dataUrl: string;
  label?: string;
}

export default function QrCodesPage() {
  const businessId = useBusinessId();
  const [qrCodes, setQrCodes] = useState<GeneratedQr[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [label, setLabel] = useState("");
  const [isFetching, setIsFetching] = useState(true);

  const fetchQrCodes = React.useCallback(async () => {
    if (!businessId) return;
    setIsFetching(true);
    const response = await fetch(`/api/qrcodes?businessId=${businessId}`);
    const data = await response.json();
    if (data.qrCodes) {
      setQrCodes(
        data.qrCodes.map((qr: any) => ({
          qrCodeId: qr.id,
          url: qr.url,
          dataUrl: qr.dataUrl,
          label: qr.label,
        }))
      );
    }
    setIsFetching(false);
  }, [businessId]);

  React.useEffect(() => {
    if (!businessId) return;
    void fetchQrCodes();
  }, [fetchQrCodes, businessId]);

  const handleGenerate = async () => {
    if (!businessId) return;
    setIsLoading(true);
    const result = await generateQrCodeAction(businessId, label || undefined);

    if (result.success) {
      await fetchQrCodes();
      setLabel("");
    }
    setIsLoading(false);
  };

  const downloadQr = (dataUrl: string, name: string) => {
    const link = document.createElement("a");
    link.download = `qrcode-${name}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">QR Codes</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Générez des QR codes pour votre établissement
        </p>
      </div>

      {/* Generate */}
      <Card>
        <div className="flex items-end gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
              Libellé (optionnel)
            </label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ex: Table 1, Comptoir..."
              className="w-full px-4 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/20 focus:border-[var(--color-brand-500)]"
            />
          </div>
          <Button onClick={handleGenerate} isLoading={isLoading}>
            <Plus className="w-4 h-4" />
            Générer un QR Code
          </Button>
        </div>
      </Card>

      {/* Generated QR codes */}
      {isFetching ? (
        <div className="flex justify-center p-12 text-[var(--color-text-muted)] animate-pulse">
          Chargement des QR codes...
        </div>
      ) : qrCodes.length === 0 ? (
        <EmptyState
          icon={<QrCode className="w-8 h-8" />}
          title="Aucun QR code généré"
          description="Cliquez sur le bouton ci-dessus pour créer votre premier QR code."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {qrCodes.map((qr) => (
            <Card key={qr.qrCodeId} hover className="text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="p-3 bg-white rounded-xl shadow-inner">
                  <img
                    src={qr.dataUrl}
                    alt="QR Code"
                    className="w-40 h-40"
                  />
                </div>
                {qr.label && (
                   <span className="text-sm font-semibold">{qr.label}</span>
                )}
                <p className="text-xs text-[var(--color-text-muted)] break-all max-w-full">
                  {qr.url}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    downloadQr(qr.dataUrl, qr.label ? qr.label : qr.qrCodeId.slice(-6))
                  }
                >
                  <Download className="w-4 h-4" />
                  Télécharger
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
