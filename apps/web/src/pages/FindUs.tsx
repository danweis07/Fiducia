import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  MapPin,
  Phone,
  Navigation,
  Landmark,
  ExternalLink,
  Loader2,
  LocateFixed,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocationSearch } from "@/hooks/useLocations";
import { Spinner } from "@/components/common/Spinner";
import type { BranchLocation } from "@/types";

type FilterType = "all" | "atm" | "branch";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FindUs() {
  const { t } = useTranslation("banking");
  const [position, setPosition] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [isLocating, setIsLocating] = useState(false);

  const { data: locationsData, isLoading } = useLocationSearch(
    position
      ? {
          latitude: position.latitude,
          longitude: position.longitude,
          radiusMiles: 25,
          type: filter === "all" ? undefined : filter,
        }
      : null,
  );

  const locations = locationsData?.locations ?? [];

  const requestLocation = () => {
    setIsLocating(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError(t("findUs.geolocationNotSupported"));
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setIsLocating(false);
      },
      (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setLocationError(t("findUs.locationDenied"));
            break;
          case err.POSITION_UNAVAILABLE:
            setLocationError(t("findUs.locationUnavailable"));
            break;
          case err.TIMEOUT:
            setLocationError(t("findUs.locationTimeout"));
            break;
          default:
            setLocationError(t("findUs.locationUnknownError"));
        }
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  };

  useEffect(() => {
    requestLocation();
  }, []);

  const openDirections = (location: BranchLocation) => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`,
      "_blank",
    );
  };

  const callLocation = (phone: string) => {
    window.open(`tel:${phone}`);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("findUs.title")}</h1>
        <p className="text-muted-foreground">{t("findUs.subtitle")}</p>
      </div>

      {/* Filter + locate */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(["all", "atm", "branch"] as FilterType[]).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
              className="capitalize"
            >
              {f === "atm"
                ? t("findUs.atms")
                : f === "branch"
                  ? t("findUs.branches")
                  : t("findUs.all")}
            </Button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={requestLocation} disabled={isLocating}>
          {isLocating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <LocateFixed className="h-4 w-4 mr-2" />
          )}
          {isLocating ? t("findUs.locating") : t("findUs.updateLocation")}
        </Button>
      </div>

      {/* Location denied */}
      {locationError && (
        <Card>
          <CardContent className="py-12 text-center">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">{t("findUs.locationRequired")}</h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">{locationError}</p>
            <Button className="mt-4" onClick={requestLocation}>
              {t("findUs.tryAgain")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {isLoading && position && (
        <div className="flex justify-center py-4" role="status" aria-label="Loading">
          <Spinner />
        </div>
      )}

      {/* Results */}
      {!isLoading && !locationError && locations.length === 0 && position && (
        <Card>
          <CardContent className="py-12 text-center">
            <MapPin className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">{t("findUs.noLocations")}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("findUs.expandSearch")}</p>
          </CardContent>
        </Card>
      )}

      {locations.length > 0 && (
        <div className="grid gap-4">
          {locations.map((location) => {
            const isAtm = location.type === "atm";
            return (
              <Card key={location.id}>
                <CardContent className="py-4">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div
                      className={`rounded-full p-2 shrink-0 ${
                        isAtm ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                      }`}
                    >
                      {isAtm ? <MapPin className="h-5 w-5" /> : <Landmark className="h-5 w-5" />}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm">{location.name}</h3>
                        <Badge variant={isAtm ? "secondary" : "outline"} className="text-[10px]">
                          {isAtm ? t("findUs.atm") : t("findUs.branch")}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <div
                            className={`h-2 w-2 rounded-full ${
                              location.isOpen ? "bg-green-500" : "bg-red-500"
                            }`}
                          />
                          <span
                            className={`text-xs ${location.isOpen ? "text-green-600" : "text-red-600"}`}
                          >
                            {location.isOpen ? t("findUs.open") : t("findUs.closed")}
                          </span>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground">
                        {location.address}, {location.city}, {location.state} {location.zip}
                      </p>

                      {/* Services */}
                      {location.services.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {location.services.slice(0, 4).map((s) => (
                            <Badge key={s} variant="outline" className="text-[10px] py-0">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Network */}
                      {location.network && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {t("findUs.network", { name: location.network })}
                        </p>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDirections(location)}
                        >
                          <Navigation className="h-3 w-3 mr-1" />
                          {t("findUs.directions")}
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </Button>
                        {location.phone && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => callLocation(location.phone!)}
                          >
                            <Phone className="h-3 w-3 mr-1" />
                            {t("findUs.call")}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Distance */}
                    {location.distanceMiles != null && (
                      <div className="text-right shrink-0">
                        <p className="font-semibold text-sm">
                          {location.distanceMiles.toFixed(1)} mi
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
