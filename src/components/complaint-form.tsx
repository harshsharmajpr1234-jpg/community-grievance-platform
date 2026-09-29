"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { api, apiErrorMessage, qs } from "@/lib/client-api";
import {
  COMPLAINT_PRIORITIES,
  CONTACT_LABELS,
  CONTACT_PREFERENCES,
  PRIORITY_LABELS,
  VERIFIED_LANDMARKS,
  type ComplaintPriority,
  type ContactPreference,
} from "@/shared/constants";
import type { AreaDto, CategoryDto, ComplaintDto, UserDto } from "@/shared/types";
import { useI18n } from "./i18n-provider";
import { LoginForm } from "./auth-forms";
import { Alert, Field, Spinner, StatusBadge } from "./ui";

type Meta = {
  categories: CategoryDto[];
  areas: AreaDto[];
  settings: { upload: { imageMaxMb: number; documentMaxMb: number }; maintenanceMode: boolean };
};

const ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";
const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;

export function ComplaintForm() {
  const { lang, t, L } = useI18n();
  const [meta, setMeta] = useState<Meta | null>(null);
  const [user, setUser] = useState<UserDto | null | undefined>(undefined);

  // Form Fields
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [wardNumber, setWardNumber] = useState<"12" | "13" | "14" | "">("");
  const [areaSource, setAreaSource] = useState<"VERIFIED_AREA" | "USER_ENTERED">("VERIFIED_AREA");
  const [areaId, setAreaId] = useState("");
  const [manualAreaName, setManualAreaName] = useState("");
  const [areaSearch, setAreaSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [priority, setPriority] = useState<ComplaintPriority>("MEDIUM");
  const [contactPreference, setContactPreference] = useState<ContactPreference>("SMS");

  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [similar, setSimilar] = useState<ComplaintDto[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ complaint: ComplaintDto; possibleDuplicates: ComplaintDto[]; uploadErrors: string[] } | null>(null);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [touchedMobile, setTouchedMobile] = useState(false);
  const similarTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    api<Meta>("/api/meta").then(setMeta).catch(() => setMeta(null));
    api<{ user: UserDto }>("/api/auth/me")
      .then((r) => {
        setUser(r.user);
        if (r.user) {
          if (r.user.name) setName(r.user.name);
          const rawMobile = r.user.mobileMasked ? r.user.mobileMasked.replace(/\D/g, "") : "";
          if (rawMobile.length === 10) setMobile(rawMobile);
          if (r.user.areaId) setAreaId(r.user.areaId);
          if (r.user.address) setAddress(r.user.address);
        }
      })
      .catch(() => setUser(null));
  }, []);

  // Wards and Localities filtering for Ward 12 & Ward 13
  const ward12Zone = useMemo(() => meta?.areas.find((a) => a.type === "ZONE" && (a.name.includes("12") || (a.nameHi && a.nameHi.includes("12")))), [meta]);
  const ward13Zone = useMemo(() => meta?.areas.find((a) => a.type === "ZONE" && (a.name.includes("13") || (a.nameHi && a.nameHi.includes("13")))), [meta]);

  const localityOptions = useMemo(() => {
    if (!meta || !wardNumber) return [];
    const targetZone = wardNumber === "12" ? ward12Zone : ward13Zone;
    if (targetZone) {
      return meta.areas.filter((a) => a.parentId === targetZone.id);
    }
    return meta.areas.filter((a) => a.type === "LOCALITY" || a.type === "STREET");
  }, [meta, wardNumber, ward12Zone, ward13Zone]);

  const filteredLocalities = useMemo(() => {
    if (!areaSearch.trim()) return localityOptions;
    const q = areaSearch.trim().toLowerCase();
    return localityOptions.filter(
      (a) => a.name.toLowerCase().includes(q) || (a.nameHi && a.nameHi.toLowerCase().includes(q))
    );
  }, [localityOptions, areaSearch]);

  // Duplicate suggestions (debounced)
  useEffect(() => {
    if (!user || !categoryId || title.trim().length < 8) {
      return;
    }
    if (similarTimer.current) clearTimeout(similarTimer.current);
    similarTimer.current = setTimeout(() => {
      api<{ items: ComplaintDto[] }>(`/api/complaints/similar${qs({ categoryId, areaId, title: title.trim() })}`)
        .then((r) => setSimilar(r.items))
        .catch(() => setSimilar([]));
    }, 500);
  }, [categoryId, areaId, title, user]);

  function handleMobileChange(val: string) {
    const cleaned = val.replace(/\D/g, "").slice(0, 10);
    setMobile(cleaned);
    setTouchedMobile(true);
  }

  const isMobileValid = INDIAN_MOBILE_REGEX.test(mobile);
  const showMobileError = touchedMobile && mobile.length > 0 && !isMobileValid;
  const mobileErrorMessage = "कृपया 10 अंकों का सही मोबाइल नंबर दर्ज करें।";

  const isAreaValid =
    wardNumber !== "" &&
    ((areaSource === "VERIFIED_AREA" && areaId !== "") ||
      (areaSource === "USER_ENTERED" && manualAreaName.trim().length >= 2));

  const isFormValid =
    name.trim().length >= 2 &&
    isMobileValid &&
    categoryId !== "" &&
    isAreaValid &&
    title.trim().length >= 5 &&
    description.trim().length >= 20 &&
    address.trim().length >= 5 &&
    files.length >= 1;

  function onFiles(list: FileList | null) {
    if (!list || !meta) return;
    const next = [...files];
    const errors: string[] = [];
    Array.from(list).forEach((f) => {
      const limits = meta.settings.upload;
      const maxMb = f.type.startsWith("image/") ? limits.imageMaxMb : limits.documentMaxMb;
      if (!ACCEPT.split(",").includes(f.type)) errors.push(`${f.name}: ${L("असमर्थित प्रकार", "unsupported type")}`);
      else if (f.size > maxMb * 1024 * 1024) errors.push(`${f.name}: ${L(`अधिकतम ${maxMb} MB`, `max ${maxMb} MB`)}`);
      else if (next.length >= 6) errors.push(L("अधिकतम 6 फ़ाइलें", "Maximum 6 files"));
      else next.push(f);
    });
    setFiles(next);
    setFileError(errors.length ? errors.join("; ") : null);
  }

  function useGps() {
    if (!navigator.geolocation) {
      setError(L("इस डिवाइस पर GPS उपलब्ध नहीं है।", "GPS is not available on this device."));
      return;
    }
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setGpsBusy(false);
      },
      () => {
        setError(L("लोकेशन प्राप्त नहीं हो सकी। कृपया अनुमति दें।", "Could not get location. Please allow permission."));
        setGpsBusy(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTouchedMobile(true);
    if (!isFormValid) {
      if (!isMobileValid) {
        setError(mobileErrorMessage);
      } else if (!isAreaValid) {
        setError(L("कृपया सही वार्ड एवं क्षेत्र का चयन करें।", "Please select valid ward and area."));
      } else if (files.length === 0) {
        setError(L("कृपया समस्या की कम से कम 1 फोटो अवश्य अपलोड करें (फोटो अनिवार्य है)।", "Please upload at least 1 photo of the issue (Photo is compulsory)."));
      } else {
        setError(L("कृपया सभी अनिवार्य fields सही भरें।", "Please fill all required fields correctly."));
      }
      return;
    }

    setBusy(true);
    setError(null);
    setProgress(null);
    try {
      const created = await api<{ complaint: ComplaintDto; possibleDuplicates: ComplaintDto[] }>("/api/complaints", {
        method: "POST",
        json: {
          name: name.trim(),
          mobile: mobile.trim(),
          wardNumber: Number(wardNumber),
          areaSource,
          areaId: areaSource === "VERIFIED_AREA" ? areaId : undefined,
          manualAreaName: areaSource === "USER_ENTERED" ? manualAreaName.trim() : undefined,
          categoryId,
          title: title.trim(),
          description: description.trim(),
          address: address.trim(),
          landmark: landmark.trim() || undefined,
          latitude: latitude || undefined,
          longitude: longitude || undefined,
          priority,
          contactPreference,
        },
      });

      const uploadErrors: string[] = [];
      for (let i = 0; i < files.length; i++) {
        setProgress(L(`फ़ाइल ${i + 1}/${files.length} अपलोड हो रही है…`, `Uploading file ${i + 1}/${files.length}…`));
        const fd = new FormData();
        fd.append("file", files[i]);
        try {
          await api(`/api/complaints/${created.complaint.id}/documents`, { method: "POST", body: fd });
        } catch (err) {
          uploadErrors.push(`${files[i].name}: ${apiErrorMessage(lang, err)}`);
        }
      }
      setResult({ ...created, uploadErrors });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(apiErrorMessage(lang, err));
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  if (user === undefined || meta === null) return <Spinner label={t("common_loading")} />;
  if (user === null) {
    return (
      <div className="mx-auto max-w-md">
        <Alert kind="info">{L("शिकायत दर्ज करने के लिए कृपया लॉगिन करें।", "Please login to register a complaint.")}</Alert>
        <div className="mt-4">
          <LoginForm onSuccess={(u) => setUser(u)} />
        </div>
      </div>
    );
  }

  if (result) {
    const c = result.complaint;
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="card border-leaf-100 bg-leaf-50 text-center">
          <p className="text-5xl" aria-hidden>✅</p>
          <h2 className="mt-2 text-xl font-bold text-leaf-800">{t("complaint_success")}</h2>
          <p className="mt-1 text-sm text-leaf-800">{L("आपकी शिकायत सफलतापूर्वक दर्ज हो गई है।", "Your complaint has been registered successfully.")}</p>
          <p className="mt-4 text-sm text-slate-600">{t("complaint_id")}</p>
          <p className="font-mono text-3xl font-extrabold tracking-wide text-civic-800">{c.code}</p>
          <p className="mt-2 text-xs text-slate-500">{L("इस आईडी को सुरक्षित रखें। स्थिति देखने के लिए आईडी और अपना मोबाइल नंबर उपयोग करें।", "Keep this ID safe. Use it with your mobile number to track status.")}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link href={`/complaints/${c.code}`} className="btn-primary">{t("common_view")}</Link>
            <Link href="/dashboard" className="btn-secondary">{t("nav_my_complaints")}</Link>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setResult(null);
                setFiles([]);
                setTitle("");
                setDescription("");
                setLandmark("");
                setLatitude("");
                setLongitude("");
              }}
            >
              {L("एक और शिकायत दर्ज करें", "Register another")}
            </button>
          </div>
        </div>
        {result.uploadErrors.length > 0 && <Alert kind="warning">{L("कुछ फ़ाइलें अपलोड नहीं हो सकीं:", "Some files could not be uploaded:")} {result.uploadErrors.join("; ")}</Alert>}
        {result.possibleDuplicates.length > 0 && (
          <div className="card">
            <h3 className="font-bold text-slate-900">{L("समान शिकायतें पहले से दर्ज हैं", "Similar complaints already exist")}</h3>
            <p className="mt-1 text-sm text-slate-600">{L("आपकी शिकायत सुरक्षित है। यदि यह वही समस्या है, तो आप मूल शिकायत को फ़ॉलो कर सकते हैं।", "Your complaint is saved. If it is the same problem, you can follow the original complaint.")}</p>
            <ul className="mt-3 divide-y divide-slate-100">
              {result.possibleDuplicates.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 py-2">
                  <Link href={`/complaints/${d.code}`} className="min-w-0">
                    <span className="font-mono text-xs font-semibold text-civic-700">{d.code}</span>
                    <span className="block truncate text-sm text-slate-800">{d.title}</span>
                  </Link>
                  <StatusBadge status={d.status} lang={lang} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  const upload = meta.settings.upload;
  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-3" noValidate>
      <div className="space-y-5 lg:col-span-2">
        {meta.settings.maintenanceMode && <Alert kind="warning">{L("रखरखाव मोड सक्रिय है। जमा करने में समस्या हो सकती है।", "Maintenance mode is active. Submission may be temporarily unavailable.")}</Alert>}
        {error && <Alert kind="error">{error}</Alert>}

        {/* Resident Personal Information */}
        <div className="card space-y-4">
          <h3 className="font-bold text-slate-900">👤 {L("शिकायतकर्ता की जानकारी", "Resident Information")}</h3>
          
          {/* Name * */}
          <Field label={L("नाम *", "Name *")} required>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              minLength={2}
              maxLength={120}
              required
              placeholder={L("अपना पूरा नाम दर्ज करें", "Enter your full name")}
            />
          </Field>

          {/* Mobile Number * [ +91 _________ ] */}
          <Field label={L("मोबाइल नंबर *", "Mobile Number *")} required error={showMobileError ? mobileErrorMessage : undefined}>
            <div className={`flex rounded-xl border overflow-hidden transition ${showMobileError ? "border-rose-500 ring-2 ring-rose-100" : "border-slate-300 focus-within:border-civic-500 focus-within:ring-2 focus-within:ring-civic-200"}`}>
              <span className="bg-slate-100 text-slate-700 px-3.5 py-2.5 text-sm font-semibold flex items-center border-r border-slate-300">
                +91
              </span>
              <input
                type="tel"
                className="w-full px-3.5 py-2.5 text-sm outline-none font-mono tracking-wider text-slate-900 bg-white"
                value={mobile}
                onChange={(e) => handleMobileChange(e.target.value)}
                maxLength={10}
                placeholder="9876543210"
                required
              />
            </div>
            {showMobileError && (
              <p className="mt-1.5 text-xs font-medium text-rose-600 flex items-center gap-1">
                ⚠️ {mobileErrorMessage}
              </p>
            )}
          </Field>
        </div>

        {/* Location & Address */}
        <div className="card space-y-5">
          <h3 className="font-bold text-slate-900">📍 {L("स्थान व पता", "Location & Address")}</h3>
          
          {/* Step 1: Ward Selection * */}
          <Field label={L("वार्ड संख्या *", "Ward Number *")} required hint={L("यह मंच वार्ड 12, 13 और 14 के लिए है", "Platform dedicated to Ward 12, 13 & 14")}>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                className={`flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl border p-2.5 sm:p-3 font-semibold text-xs sm:text-sm transition ${
                  wardNumber === "12"
                    ? "border-civic-600 bg-civic-50 text-civic-800 ring-2 ring-civic-300"
                    : "border-slate-300 bg-white text-slate-700 hover:border-civic-400"
                }`}
                onClick={() => {
                  setWardNumber("12");
                  setAreaSource("VERIFIED_AREA");
                  setAreaId("");
                  setManualAreaName("");
                  setAreaSearch("");
                }}
              >
                <span className="text-base sm:text-lg">🏛️</span>
                {L("वार्ड 12", "Ward 12")}
              </button>
              <button
                type="button"
                className={`flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl border p-2.5 sm:p-3 font-semibold text-xs sm:text-sm transition ${
                  wardNumber === "13"
                    ? "border-civic-600 bg-civic-50 text-civic-800 ring-2 ring-civic-300"
                    : "border-slate-300 bg-white text-slate-700 hover:border-civic-400"
                }`}
                onClick={() => {
                  setWardNumber("13");
                  setAreaSource("VERIFIED_AREA");
                  setAreaId("");
                  setManualAreaName("");
                  setAreaSearch("");
                }}
              >
                <span className="text-base sm:text-lg">🏛️</span>
                {L("वार्ड 13", "Ward 13")}
              </button>
              <button
                type="button"
                className={`flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl border p-2.5 sm:p-3 font-semibold text-xs sm:text-sm transition ${
                  wardNumber === "14"
                    ? "border-civic-600 bg-civic-50 text-civic-800 ring-2 ring-civic-300"
                    : "border-slate-300 bg-white text-slate-700 hover:border-civic-400"
                }`}
                onClick={() => {
                  setWardNumber("14");
                  setAreaSource("VERIFIED_AREA");
                  setAreaId("");
                  setManualAreaName("");
                  setAreaSearch("");
                }}
              >
                <span className="text-base sm:text-lg">🏛️</span>
                {L("वार्ड 14", "Ward 14")}
              </button>
            </div>
          </Field>

          {/* Step 2: Locality Selection */}
          {wardNumber ? (
            <Field label={L(`वार्ड ${wardNumber} का क्षेत्र / कॉलोनी / मोहल्ला *`, `Area / Colony in Ward ${wardNumber} *`)} required>
              <div className="space-y-2">
                {localityOptions.length > 6 && (
                  <input
                    type="text"
                    className="input text-xs"
                    placeholder={L("🔍 क्षेत्र खोजें...", "🔍 Search area...")}
                    value={areaSearch}
                    onChange={(e) => setAreaSearch(e.target.value)}
                  />
                )}
                <select
                  className="input"
                  value={areaSource === "USER_ENTERED" ? "__OTHER__" : areaId}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "__OTHER__") {
                      setAreaSource("USER_ENTERED");
                      setAreaId("");
                    } else {
                      setAreaSource("VERIFIED_AREA");
                      setAreaId(val);
                      setManualAreaName("");
                    }
                  }}
                  required
                >
                  <option value="">{L("— क्षेत्र / मोहल्ला चुनें —", "— Select area / locality —")}</option>
                  {filteredLocalities.map((a) => (
                    <option key={a.id} value={a.id}>
                      {lang === "hi" ? a.nameHi || a.name : a.name}
                    </option>
                  ))}
                  <option value="__OTHER__" className="font-semibold text-civic-700">
                    ➕ {L("मेरा क्षेत्र सूची में नहीं है", "My area is not listed")}
                  </option>
                </select>
              </div>
            </Field>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-500 text-center">
              👉 {L("क्षेत्र सूची देखने के लिए कृपया पहले वार्ड चुनें।", "Please select a ward first to choose locality.")}
            </div>
          )}

          {/* Step 3: Manual Area Input if "NOT LISTED" */}
          {areaSource === "USER_ENTERED" && (
            <Field
              label={L("अपना क्षेत्र / कॉलोनी / मोहल्ला लिखें *", "Write your area / colony / mohalla *")}
              required
              hint={L("यदि आपका क्षेत्र सूची में नहीं है तो नाम यहाँ दर्ज करें", "Specify area name if not present in verified list")}
            >
              <input
                className="input border-amber-300 bg-amber-50/20"
                value={manualAreaName}
                onChange={(e) => setManualAreaName(e.target.value)}
                minLength={2}
                maxLength={100}
                required
                placeholder={L("उदा: न्यू शिव नगर, बेनाड़ रोड", "e.g. New Shiv Nagar, Benad Road")}
              />
            </Field>
          )}

          {/* Step 4: Complete Address */}
          <Field label={L("पूरा पता *", "Complete Address *")} required hint={L("मकान नं., गली नं., पूरा पता लिखें।", "House no., street no., complete address.")}>
            <textarea
              className="input"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              maxLength={300}
              minLength={5}
              required
              rows={2}
              placeholder={L("उदा: मकान नं. 45, गली नं. 3, बेनाड़ रोड", "e.g. House No. 45, Lane No. 3, Benad Road")}
            />
          </Field>

          {/* Step 5: Landmark with suggestions */}
          <Field label={L("नज़दीकी पहचान / लैंडमार्क (ऐच्छिक)", "Landmark (Optional)")} hint={L("समाधान दल को आसानी से पहुँचने के लिए", "Helps resolution team reach quickly")}>
            <input
              className="input"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              maxLength={150}
              placeholder={L("उदा: सरकारी स्कूल के पास, पानी की टंकी के सामने", "e.g. Near Govt School, Opposite Water Tank")}
            />
            <div className="mt-2.5">
              <p className="text-[11px] font-medium text-slate-500 mb-1.5">💡 {L("त्वरित लैंडमार्क सुझाव (क्लिक करें):", "Quick landmark suggestions (click to select):")}</p>
              <div className="flex flex-wrap gap-1.5">
                {VERIFIED_LANDMARKS.slice(0, 10).map((lm) => (
                  <button
                    key={lm}
                    type="button"
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium border transition ${
                      landmark.includes(lm)
                        ? "border-civic-500 bg-civic-100 text-civic-800"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                    onClick={() => {
                      if (!landmark) setLandmark(lm);
                      else if (!landmark.includes(lm)) setLandmark(`${landmark}, ${lm}`);
                    }}
                  >
                    + {lm}
                  </button>
                ))}
              </div>
            </div>
          </Field>

          {/* GPS Location */}
          <Field label={t("complaint_gps")}>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className="btn-secondary btn-sm" onClick={useGps} disabled={gpsBusy}>
                {gpsBusy ? t("common_loading") : L("📡 मेरी GPS लोकेशन उपयोग करें", "📡 Use my GPS location")}
              </button>
              {latitude && (
                <span className="text-xs text-slate-600">
                  {latitude}, {longitude}{" "}
                  <button type="button" className="text-rose-600 underline" onClick={() => { setLatitude(""); setLongitude(""); }}>
                    {L("हटाएँ", "remove")}
                  </button>
                </span>
              )}
            </div>
          </Field>
        </div>

        {/* Problem Category & Description */}
        <div className="card space-y-4">
          <h3 className="font-bold text-slate-900">📝 {L("समस्या का विवरण", "Problem Details")}</h3>

          {/* Problem Category * */}
          <Field label={L("समस्या की श्रेणी *", "Problem Category *")} required>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4" role="radiogroup" aria-label={t("common_category")}>
              {meta.categories.map((c) => {
                const active = categoryId === c.id;
                return (
                  <button
                    type="button"
                    key={c.id}
                    role="radio"
                    aria-checked={active}
                    onClick={() => setCategoryId(c.id)}
                    className={`flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl border p-2 text-center text-sm font-medium transition ${
                      active ? "border-civic-500 bg-civic-50 text-civic-800 ring-2 ring-civic-200" : "border-slate-200 bg-white text-slate-700 hover:border-civic-200"
                    }`}
                  >
                    <span className="text-xl" aria-hidden>{c.icon}</span>
                    {lang === "hi" ? c.nameHi : c.nameEn}
                  </button>
                );
              })}
            </div>
          </Field>

          {/* Title */}
          <Field label={L("विषय / संक्षिप्त शीर्षक *", "Title / Short Summary *")} required hint={L("5–200 अक्षर", "5–200 characters")}>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              minLength={5}
              maxLength={200}
              required
              placeholder={L("जैसे: गली नं. 4 में 3 दिनों से स्ट्रीट लाइट बंद है", "e.g. Street light off for 3 days in Lane 4")}
            />
          </Field>

          {similar.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
              <p className="font-semibold text-amber-900">{L("क्या यह इनमें से किसी जैसी है?", "Is it similar to one of these?")}</p>
              <ul className="mt-1 space-y-1">
                {similar.map((s) => (
                  <li key={s.id}>
                    <Link href={`/complaints/${s.code}`} target="_blank" className="text-civic-700 hover:underline">
                      {s.code} — {s.title}
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-xs text-amber-800">{L("आप फिर भी अपनी शिकायत दर्ज कर सकते हैं।", "You can still submit your complaint.")}</p>
            </div>
          )}

          {/* Problem Description * */}
          <Field label={L("समस्या का पूरा विवरण *", "Problem Description *")} required hint={L("कम से कम 20 अक्षर — समस्या कब से है, कितने लोग प्रभावित हैं आदि।", "At least 20 characters — since when, how many people are affected, etc.")}>
            <textarea
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              minLength={20}
              maxLength={5000}
              required
              rows={5}
              placeholder={L("समस्या के बारे में विस्तार से लिखें...", "Describe the issue in detail...")}
            />
          </Field>
        </div>

        {/* Photo / Document Upload (Compulsory *) */}
        <div className={`card space-y-4 transition ${files.length === 0 ? "border-amber-300 bg-amber-50/10" : "border-leaf-200 bg-leaf-50/10"}`}>
          <h3 className="font-bold text-slate-900 flex flex-wrap items-center justify-between gap-2">
            <span>📷 {L("फोटो / दस्तावेज अपलोड (अनिवार्य *)", "Photos / Documents Upload (Compulsory *)")}</span>
            {files.length === 0 ? (
              <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200">
                ⚠️ {L("फोटो अनिवार्य है", "Photo required")}
              </span>
            ) : (
              <span className="text-xs font-semibold text-leaf-700 bg-leaf-50 px-2.5 py-1 rounded-md border border-leaf-200">
                ✅ {files.length} {L("फोटो संलग्न", "photo attached")}
              </span>
            )}
          </h3>
          <p className="text-xs text-slate-500">
            {L(`कृपया समस्या की स्पष्ट फोटो अपलोड करें। फोटो (JPG/PNG/WEBP, ≤${upload.imageMaxMb} MB), PDF (≤${upload.documentMaxMb} MB) — अधिकतम 6 फ़ाइलें।`, `Please upload a clear photo of the issue. Photos (JPG/PNG/WEBP, ≤${upload.imageMaxMb} MB), PDF (≤${upload.documentMaxMb} MB) — up to 6 files.`)}
          </p>
          <input
            type="file"
            accept={ACCEPT}
            multiple
            required
            onChange={(e) => onFiles(e.target.files)}
            className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-civic-50 file:px-4 file:py-2.5 file:font-semibold file:text-civic-700 hover:file:bg-civic-100 cursor-pointer"
            aria-label={t("complaint_files")}
          />
          {files.length === 0 && (
            <p className="text-xs font-medium text-rose-600 flex items-center gap-1">
              ⚠️ {L("शिकायत दर्ज करने के लिए समस्या की कम से कम 1 फोटो अपलोड करना अनिवार्य है।", "Uploading at least 1 photo of the issue is compulsory to submit a complaint.")}
            </p>
          )}
          {fileError && <Alert kind="warning">{fileError}</Alert>}
          {files.length > 0 && (
            <ul className="space-y-1 text-sm">
              {files.map((f, i) => (
                <li key={`${f.name}-${i}`} className="flex items-center justify-between rounded-lg bg-leaf-50 border border-leaf-200 px-3 py-1.5 text-slate-800">
                  <span className="truncate">{f.type.startsWith("image/") ? "🖼️" : "📄"} {f.name} <span className="text-slate-400">({(f.size / 1024 / 1024).toFixed(1)} MB)</span></span>
                  <button type="button" className="text-rose-600 font-bold hover:bg-rose-100 px-2 py-0.5 rounded" aria-label={`Remove ${f.name}`} onClick={() => setFiles(files.filter((_, j) => j !== i))}>✕</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Sidebar Controls & Submission */}
      <div className="space-y-5">
        <div className="card space-y-4">
          <Field label={t("common_priority")}>
            <div className="grid grid-cols-2 gap-2">
              {COMPLAINT_PRIORITIES.map((p) => (
                <label key={p} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium ${priority === p ? "border-civic-500 bg-civic-50 text-civic-800" : "border-slate-200 text-slate-700"}`}>
                  <input type="radio" name="priority" value={p} checked={priority === p} onChange={() => setPriority(p)} />
                  {lang === "hi" ? PRIORITY_LABELS[p].hi : PRIORITY_LABELS[p].en}
                </label>
              ))}
            </div>
          </Field>

          <Field label={t("complaint_contact")}>
            <select className="input" value={contactPreference} onChange={(e) => setContactPreference(e.target.value as ContactPreference)}>
              {CONTACT_PREFERENCES.map((c) => (
                <option key={c} value={c}>{lang === "hi" ? CONTACT_LABELS[c].hi : CONTACT_LABELS[c].en}</option>
              ))}
            </select>
          </Field>

          <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 border border-slate-200">
            <p>{L("दर्ज करने वाले:", "Submitting as:")} <strong>{name || user.name || user.mobileMasked}</strong></p>
            <p className="mt-0.5">{L("सत्यापित मोबाइल:", "Verified Mobile:")} <strong className="font-mono text-slate-800">+91 {mobile}</strong></p>
          </div>

          <button
            type="submit"
            className="btn-primary w-full py-3 text-base shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={busy || !isFormValid}
          >
            {busy ? progress || t("common_loading") : `📝 ${L("शिकायत दर्ज करें", "Submit Complaint")}`}
          </button>

          {!isFormValid && (
            <p className="text-xs text-rose-600 font-medium text-center">
              {!isMobileValid
                ? mobileErrorMessage
                : !isAreaValid
                ? L("कृपया सही वार्ड एवं क्षेत्र का चयन करें।", "Please select valid ward and area.")
                : files.length === 0
                ? L("कृपया समस्या की कम से कम 1 फोटो अवश्य अपलोड करें।", "Please upload at least 1 photo of the problem.")
                : L("कृपया सभी अनिवार्य (* ) fields भरें।", "Please fill all compulsory (*) fields.")}
            </p>
          )}

          <p className="text-xs text-slate-500 text-center">
            {L("जमा करके आप नियमों से सहमत होते हैं। असत्यापित या अभद्र सामग्री अस्वीकार की जा सकती है।", "By submitting you agree to platform rules.")}
          </p>
        </div>

        <div className="card bg-civic-50 text-sm text-civic-900 space-y-2">
          <p className="font-bold flex items-center gap-1">💡 {L("महत्वपूर्ण सुझाव", "Important Tips")}</p>
          <ul className="list-disc space-y-1.5 pl-5 text-xs text-civic-800">
            <li><strong>{L("वार्ड 12, 13 एवं 14 विशेष:", "Ward 12, 13 & 14 Exclusive:")}</strong> {L("यह मंच केवल वार्ड 12, 13 एवं 14 के लिए ही है।", "This platform is dedicated to Ward 12, 13 & 14 only.")}</li>
            <li><strong>{L("मोबाइल नंबर अनिवार्य है:", "Mobile Number Compulsory:")}</strong> {L("शिकायत का अपडेट SMS/Call से प्राप्त होगा।", "You will get status updates via SMS/Call.")}</li>
            <li><strong>{L("गोपनीयता:", "Privacy:")}</strong> {L("आपका पूरा पता और मोबाइल नंबर केवल संबंधित एडमिन को दिखेगा।", "Your full address & mobile are only visible to authorized admins.")}</li>
            <li>{L("सटीक लैंडमार्क और फोटो जोड़ने से समाधान तेज़ी से होता है।", "Clear photos & landmarks lead to faster resolution.")}</li>
          </ul>
        </div>
      </div>
    </form>
  );
}
