import { randomBytes, randomUUID } from "node:crypto";
import { collections } from "./index";
import { hashPassword } from "@/server/auth/password";
import type { ComplaintStatus } from "@/shared/constants";

const daysAgo = (d: number, h = 0) => new Date(Date.now() - d * 24 * 3600 * 1000 - h * 3600 * 1000);

export async function seedReferenceData() {
  const c = await collections();
  const now = new Date();

  const categories = [
    { slug: "road", nameEn: "Road", nameHi: "सड़क", icon: "🛣️", defaultDepartment: "Municipal Corporation / JDA", sortOrder: 1 },
    { slug: "street-light", nameEn: "Street Light", nameHi: "स्ट्रीट लाइट", icon: "💡", defaultDepartment: "Municipal Corporation (Lighting)", sortOrder: 2 },
    { slug: "water", nameEn: "Water", nameHi: "पानी", icon: "🚰", defaultDepartment: "PHED (Water Supply)", sortOrder: 3 },
    { slug: "sewer-drainage", nameEn: "Drainage / Sewer", nameHi: "सीवर / ड्रेनेज", icon: "🕳️", defaultDepartment: "Municipal Corporation (Sewerage)", sortOrder: 4 },
    { slug: "garbage-cleanliness", nameEn: "Garbage / Cleanliness", nameHi: "कचरा / सफाई", icon: "🧹", defaultDepartment: "Municipal Corporation (Sanitation)", sortOrder: 5 },
    { slug: "electricity", nameEn: "Electricity", nameHi: "बिजली", icon: "⚡", defaultDepartment: "Electricity Distribution Company (JVVNL)", sortOrder: 6 },
    { slug: "traffic-parking", nameEn: "Traffic / Parking", nameHi: "ट्रैफिक / पार्किंग", icon: "🚦", defaultDepartment: "Traffic Police", sortOrder: 7 },
    { slug: "park-public-area", nameEn: "Public Area / Park", nameHi: "सार्वजनिक क्षेत्र / पार्क", icon: "🌳", defaultDepartment: "Municipal Corporation (Garden)", sortOrder: 8 },
    { slug: "street-footpath", nameEn: "Street / Footpath", nameHi: "गली / फुटपाथ", icon: "🚶", defaultDepartment: "Municipal Corporation", sortOrder: 9 },
    { slug: "other", nameEn: "Other Local Issue", nameHi: "अन्य स्थानीय समस्या", icon: "📌", defaultDepartment: null, sortOrder: 10 },
  ];

  for (const cat of categories) {
    await c.complaintCategories.updateOne(
      { slug: cat.slug },
      {
        $setOnInsert: {
          id: randomUUID(),
          slug: cat.slug,
          nameEn: cat.nameEn,
          nameHi: cat.nameHi,
          icon: cat.icon,
          defaultDepartment: cat.defaultDepartment,
          sortOrder: cat.sortOrder,
          isAvailable: true,
          isActive: true,
          createdAt: now,
        },
      },
      { upsert: true }
    );
  }

  const existingAreasCount = await c.areas.countDocuments({});
  if (existingAreasCount === 0) {
    const jaipurId = randomUUID();
    const ward12Id = randomUUID();
    const ward13Id = randomUUID();
    const ward14Id = randomUUID();

    await c.areas.insertMany([
      { id: jaipurId, name: "Jaipur", nameHi: "जयपुर", type: "CITY", sortOrder: 0, createdAt: now },
      { id: ward12Id, name: "Ward 12", nameHi: "वार्ड 12", type: "ZONE", parentId: jaipurId, sortOrder: 1, createdAt: now },
      { id: ward13Id, name: "Ward 13", nameHi: "वार्ड 13", type: "ZONE", parentId: jaipurId, sortOrder: 2, createdAt: now },
      { id: ward14Id, name: "Ward 14", nameHi: "वार्ड 14", type: "ZONE", parentId: jaipurId, sortOrder: 3, createdAt: now },
    ]);

    const ward12Localities = [
      ["Benad Road", "बेनाड़ रोड"],
      ["Niwaru Road", "निवारू रोड"],
      ["Dadi Ka Phatak", "दादी का फाटक"],
      ["Railway Crossing Area", "रेलवे क्रॉसिंग क्षेत्र"],
      ["Benad Station Area", "बेनाड़ स्टेशन क्षेत्र"],
    ];

    const ward13Localities = [
      ["Murlipura", "मुरलीपुरा"],
      ["Jhotwara", "झोटवाड़ा"],
      ["Kalwar Road", "कालवाड़ रोड"],
      ["Khatipura", "खातीपुरा"],
      ["Sirsi Road", "सिरसी रोड"],
    ];

    const ward14Localities = [
      ["Shastri Nagar", "शास्त्री नगर"],
      ["Vidhyadhar Nagar", "विद्याधर नगर"],
      ["Ambabari", "अम्बाबाड़ी"],
      ["Sikar Road", "सीकर रोड"],
    ];

    const localityDocs = [
      ...ward12Localities.map(([name, nameHi], i) => ({
        id: randomUUID(),
        name,
        nameHi,
        type: "LOCALITY" as const,
        parentId: ward12Id,
        sortOrder: i,
        createdAt: now,
      })),
      ...ward13Localities.map(([name, nameHi], i) => ({
        id: randomUUID(),
        name,
        nameHi,
        type: "LOCALITY" as const,
        parentId: ward13Id,
        sortOrder: i,
        createdAt: now,
      })),
      ...ward14Localities.map(([name, nameHi], i) => ({
        id: randomUUID(),
        name,
        nameHi,
        type: "LOCALITY" as const,
        parentId: ward14Id,
        sortOrder: i,
        createdAt: now,
      })),
    ];

    await c.areas.insertMany(localityDocs);
  }

  const existingServicesCount = await c.governmentServices.countDocuments({});
  if (existingServicesCount === 0) {
    await c.governmentServices.insertMany([
      { id: randomUUID(), name: "Emergency Response (All-in-one)", nameHi: "आपातकालीन सहायता (एकीकृत)", department: "Emergency Response Support System", category: "EMERGENCY", phone: "112", description: "Single emergency number for police, fire and ambulance across India.", isEmergency: true, sortOrder: 1, createdAt: now },
      { id: randomUUID(), name: "Police Control Room", nameHi: "पुलिस कंट्रोल रूम", department: "Rajasthan Police", category: "POLICE", phone: "100", description: "Police emergency helpline.", isEmergency: true, sortOrder: 2, createdAt: now },
      { id: randomUUID(), name: "Fire Service", nameHi: "अग्निशमन सेवा", department: "Fire & Emergency Services", category: "FIRE", phone: "101", description: "Fire emergency helpline.", isEmergency: true, sortOrder: 3, createdAt: now },
      { id: randomUUID(), name: "Ambulance", nameHi: "एम्बुलेंस", department: "Health Department", category: "HEALTH", phone: "108", description: "Free ambulance service.", isEmergency: true, sortOrder: 4, createdAt: now },
      { id: randomUUID(), name: "Women Helpline", nameHi: "महिला हेल्पलाइन", department: "Women & Child Development", category: "EMERGENCY", phone: "1091", description: "Helpline for women in distress.", isEmergency: true, sortOrder: 5, createdAt: now },
      { id: randomUUID(), name: "Child Helpline", nameHi: "चाइल्ड हेल्पलाइन", department: "Ministry of Women & Child Development", category: "EMERGENCY", phone: "1098", description: "24x7 helpline for children in need of care and protection.", isEmergency: true, sortOrder: 6, createdAt: now },
      { id: randomUUID(), name: "Rajasthan Sampark (State Grievance Portal)", nameHi: "राजस्थान संपर्क (राज्य शिकायत पोर्टल)", department: "Government of Rajasthan", category: "GRIEVANCE_PORTAL", phone: "181", website: "https://sampark.rajasthan.gov.in", description: "Official state portal and helpline for registering grievances with government departments.", isEmergency: false, sortOrder: 1, createdAt: now },
      { id: randomUUID(), name: "CPGRAMS (Central Grievance Portal)", nameHi: "CPGRAMS (केंद्रीय शिकायत पोर्टल)", department: "Government of India", category: "GRIEVANCE_PORTAL", website: "https://pgportal.gov.in", description: "Centralised Public Grievance Redress and Monitoring System for central government departments.", isEmergency: false, sortOrder: 2, createdAt: now },
      { id: randomUUID(), name: "Electricity Complaint Helpline", nameHi: "बिजली शिकायत हेल्पलाइन", department: "Electricity Distribution Company (Discom)", category: "ELECTRICITY", phone: "1912", description: "National helpline for power supply complaints (outages, faults, billing).", isEmergency: false, sortOrder: 1, createdAt: now },
      { id: randomUUID(), name: "Health Advice Helpline", nameHi: "स्वास्थ्य सलाह हेल्पलाइन", department: "Health Department", category: "HEALTH", phone: "104", description: "Medical advice and health information helpline.", isEmergency: false, sortOrder: 2, createdAt: now },
      { id: randomUUID(), name: "National Consumer Helpline", nameHi: "राष्ट्रीय उपभोक्ता हेल्पलाइन", department: "Department of Consumer Affairs", category: "OTHER", phone: "1915", website: "https://consumerhelpline.gov.in", description: "Consumer grievance guidance and registration.", isEmergency: false, sortOrder: 1, createdAt: now },
    ]);
  }

  return true;
}

export async function seedAdminFromEnv() {
  const c = await collections();
  const email = (process.env.ADMIN_EMAIL || "riteshsharmajpr1234@gmail.com").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "AdminPass123!";
  const passwordHash = await hashPassword(password);
  const now = new Date();

  const existing = await c.admins.findOne({});
  if (!existing) {
    await c.admins.insertOne({
      id: randomUUID(),
      email,
      name: process.env.ADMIN_NAME?.trim() || "Ward Administrator",
      passwordHash,
      role: "SUPER_ADMIN",
      mustChangePassword: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
      isActive: true,
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now,
    });
    console.info(`[seed] Created SUPER_ADMIN ${email}.`);
  } else {
    await c.admins.updateOne(
      { id: existing.id },
      {
        $set: {
          email,
          passwordHash,
          updatedAt: now,
        },
      }
    );
    console.info(`[seed] Updated SUPER_ADMIN ${email}.`);
  }
  return true;
}

async function nextCode(): Promise<string> {
  const c = await collections();
  const year = new Date().getFullYear();
  const key = `complaint:${year}`;
  const res = await c.counters.findOneAndUpdate(
    { key },
    { $inc: { value: 1 } },
    { upsert: true, returnDocument: "after" }
  );
  const seq = res?.value || 1;
  return `JSM-${year}-${String(seq).padStart(6, "0")}`;
}

export async function seedDemoData() {
  const c = await collections();
  const count = await c.complaints.countDocuments({ isDemo: true });
  if (count > 0) return false;

  const cats = await c.complaintCategories.find({}).toArray();
  const cat = (slug: string) => cats.find((item) => item.slug === slug)!;
  const locs = await c.areas.find({ type: "LOCALITY" }).toArray();
  const loc = (name: string) => locs.find((item) => item.name === name) ?? locs[0];

  const demoPasswordHash = await hashPassword(randomBytes(16).toString("hex"));
  const now = new Date();

  const u1Id = randomUUID();
  const u2Id = randomUUID();

  await c.users.updateOne(
    { mobile: "9999900001" },
    {
      $setOnInsert: {
        id: u1Id,
        mobile: "9999900001",
        name: "Demo Resident One",
        passwordHash: demoPasswordHash,
        areaId: loc("Benad Road")?.id,
        ward: "Ward 12",
        language: "hi",
        createdAt: now,
        updatedAt: now,
      },
    },
    { upsert: true }
  );

  await c.users.updateOne(
    { mobile: "9999900002" },
    {
      $setOnInsert: {
        id: u2Id,
        mobile: "9999900002",
        name: "Demo Resident Two",
        passwordHash: demoPasswordHash,
        areaId: loc("Murlipura")?.id,
        ward: "Ward 13",
        language: "en",
        createdAt: now,
        updatedAt: now,
      },
    },
    { upsert: true }
  );

  const u1 = (await c.users.findOne({ mobile: "9999900001" }))!;
  const u2 = (await c.users.findOne({ mobile: "9999900002" }))!;

  type DemoComplaint = {
    user: typeof u1;
    category: string;
    title: string;
    description: string;
    area: string;
    address: string;
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    flow: { status: ComplaintStatus; message: string; daysAgo: number }[];
  };

  const demo: DemoComplaint[] = [
    {
      user: u1,
      category: "street-light",
      title: "[DEMO] Street light not working near railway crossing",
      description: "[DEMO DATA] The street light pole near the railway crossing has been off for a week. The area becomes unsafe for pedestrians after dark. This is sample data for demonstration only.",
      area: "Dadi Ka Phatak",
      address: "Near railway crossing, opposite tea stall",
      priority: "HIGH",
      flow: [
        { status: "SUBMITTED", message: "Complaint submitted by resident", daysAgo: 12 },
        { status: "VERIFIED", message: "Verified by moderation team", daysAgo: 11 },
        { status: "FORWARDED", message: "Forwarded to municipal lighting section", daysAgo: 10 },
        { status: "IN_PROGRESS", message: "Repair team scheduled", daysAgo: 7 },
        { status: "RESOLVED", message: "Light repaired and tested at night", daysAgo: 4 },
      ],
    },
    {
      user: u2,
      category: "water",
      title: "[DEMO] Low water pressure in morning supply",
      description: "[DEMO DATA] For the last ten days the morning water supply has very low pressure on the second floor of buildings in the lane. Sample record for demonstration only.",
      area: "Murlipura",
      address: "Lane 4, near community park",
      priority: "MEDIUM",
      flow: [
        { status: "SUBMITTED", message: "Complaint submitted by resident", daysAgo: 6 },
        { status: "VERIFIED", message: "Verified — multiple residents reported the same", daysAgo: 5 },
        { status: "ASSIGNED", message: "Assigned to support staff for follow-up with PHED", daysAgo: 4 },
        { status: "IN_PROGRESS", message: "PHED inspection requested", daysAgo: 2 },
      ],
    },
    {
      user: u1,
      category: "garbage-cleanliness",
      title: "[DEMO] Garbage not collected for three days",
      description: "[DEMO DATA] The door-to-door garbage vehicle has not visited the colony for three days and waste is piling up at the corner. Sample record for demonstration only.",
      area: "Benad Road",
      address: "Corner plot near temple",
      priority: "HIGH",
      flow: [
        { status: "SUBMITTED", message: "Complaint submitted by resident", daysAgo: 2 },
        { status: "VERIFIED", message: "Verified with photo evidence", daysAgo: 1 },
      ],
    },
    {
      user: u2,
      category: "road",
      title: "[DEMO] Potholes on the approach road",
      description: "[DEMO DATA] Several deep potholes have formed on the approach road after rains, causing two-wheeler accidents. Sample record for demonstration only.",
      area: "Kalwar Road",
      address: "Between bus stop and petrol pump",
      priority: "URGENT",
      flow: [{ status: "SUBMITTED", message: "Complaint submitted by resident", daysAgo: 0 }],
    },
    {
      user: u1,
      category: "sewer-drainage",
      title: "[DEMO] Open drain overflowing",
      description: "[DEMO DATA] The open drain near the school overflows every evening and mosquitoes are increasing. Sample record for demonstration only.",
      area: "Jhotwara",
      address: "Near government school gate",
      priority: "MEDIUM",
      flow: [
        { status: "SUBMITTED", message: "Complaint submitted by resident", daysAgo: 20 },
        { status: "VERIFIED", message: "Verified", daysAgo: 19 },
        { status: "NEEDS_INFORMATION", message: "Please share a photo and the exact landmark of the drain.", daysAgo: 18 },
      ],
    },
  ];

  for (const d of demo) {
    const code = await nextCode();
    const last = d.flow[d.flow.length - 1];
    const created = daysAgo(d.flow[0].daysAgo, 3);
    const compId = randomUUID();
    const catObj = cat(d.category);
    const locObj = loc(d.area);

    await c.complaints.insertOne({
      id: compId,
      code,
      userId: d.user.id,
      categoryId: catObj.id,
      title: d.title,
      description: d.description,
      areaId: locObj.id,
      address: d.address,
      priority: d.priority,
      status: last.status,
      department: catObj.defaultDepartment ?? null,
      isDemo: true,
      createdAt: created,
      updatedAt: daysAgo(last.daysAgo, 1),
      lastUpdateAt: daysAgo(last.daysAgo, 1),
      resolvedAt: last.status === "RESOLVED" ? daysAgo(last.daysAgo, 1) : null,
    });

    let prev: ComplaintStatus | null = null;
    for (const step of d.flow) {
      await c.complaintUpdates.insertOne({
        id: randomUUID(),
        complaintId: compId,
        userId: step.status === "SUBMITTED" ? d.user.id : null,
        type: step.status === "NEEDS_INFORMATION" ? "INFO_REQUEST" : "STATUS_CHANGE",
        oldStatus: prev,
        newStatus: step.status,
        message: step.message,
        isPublic: true,
        createdAt: daysAgo(step.daysAgo, 1),
      });
      prev = step.status;
    }
  }

  await c.notices.insertMany([
    {
      id: randomUUID(),
      title: "[DEMO] Water supply maintenance — timing change",
      titleHi: "[डेमो] जल आपूर्ति रखरखाव — समय में परिवर्तन",
      description: "This is demo content. Morning water supply timing will shift by one hour during pipeline maintenance work. Residents are requested to store water in advance.",
      descriptionHi: "यह डेमो सामग्री है। पाइपलाइन रखरखाव कार्य के दौरान सुबह की जल आपूर्ति का समय एक घंटे आगे रहेगा। निवासियों से पहले से पानी संग्रहित करने का अनुरोध है।",
      category: "WATER",
      priority: "HIGH",
      status: "PUBLISHED",
      isPinned: true,
      isDemo: true,
      publishDate: daysAgo(1),
      expiryDate: new Date(Date.now() + 20 * 24 * 3600 * 1000),
      createdAt: now,
      updatedAt: now,
    },
    {
      id: randomUUID(),
      title: "[DEMO] Community cleanliness drive this Sunday",
      titleHi: "[डेमो] इस रविवार सामुदायिक स्वच्छता अभियान",
      description: "Demo content. Residents are invited to join the cleanliness drive at the community park at 7:00 AM. Gloves and bags will be provided.",
      descriptionHi: "डेमो सामग्री। निवासियों को सुबह 7:00 बजे सामुदायिक पार्क में स्वच्छता अभियान में शामिल होने का निमंत्रण है। दस्ताने और बैग उपलब्ध कराए जाएँगे।",
      category: "COMMUNITY",
      priority: "MEDIUM",
      status: "PUBLISHED",
      isPinned: false,
      isDemo: true,
      publishDate: daysAgo(3),
      createdAt: now,
      updatedAt: now,
    },
    {
      id: randomUUID(),
      title: "[DEMO] How to use this platform",
      titleHi: "[डेमो] इस मंच का उपयोग कैसे करें",
      description: "Demo content. Login with your mobile number, submit a local problem with photos, and track its status using your Complaint ID. All complaint updates are recorded transparently.",
      descriptionHi: "डेमो सामग्री। अपने मोबाइल नंबर से लॉगिन करें, फोटो के साथ स्थानीय समस्या दर्ज करें और अपनी शिकायत आईडी से स्थिति ट्रैक करें। सभी अपडेट पारदर्शी रूप से दर्ज होते हैं।",
      category: "PUBLIC_NOTICE",
      priority: "LOW",
      status: "PUBLISHED",
      isPinned: false,
      isDemo: true,
      publishDate: daysAgo(10),
      createdAt: now,
      updatedAt: now,
    },
  ]);

  const p1Id = randomUUID();
  const p2Id = randomUUID();

  await c.developmentProjects.insertMany([
    {
      id: p1Id,
      name: "[DEMO] Sample road resurfacing project",
      nameHi: "[डेमो] नमूना सड़क पुनर्निर्माण परियोजना",
      description: "DEMO DATA — not a real government project. Illustrates how a development work entry looks: scope, agency, dates and progress updates entered by authorised admins.",
      location: "Dadi Ka Phatak Main Road (demo)",
      areaId: loc("Dadi Ka Phatak")?.id || locs[0].id,
      department: "Demo Agency",
      startDate: daysAgo(60),
      expectedCompletion: new Date(Date.now() + 60 * 24 * 3600 * 1000),
      status: "IN_PROGRESS",
      progress: 45,
      sourceNote: "Demo entry created by seed script.",
      isPublished: true,
      isDemo: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: p2Id,
      name: "[DEMO] Sample community park renovation",
      nameHi: "[डेमो] नमूना सामुदायिक पार्क नवीनीकरण",
      description: "DEMO DATA — not a real government project. Sample planned work entry with 0% progress.",
      location: "Murlipura (demo)",
      areaId: loc("Murlipura")?.id || locs[0].id,
      department: "Demo Agency",
      status: "PLANNED",
      progress: 0,
      sourceNote: "Demo entry created by seed script.",
      isPublished: true,
      isDemo: true,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  await c.communityPosts.insertMany([
    {
      id: randomUUID(),
      title: "[DEMO] Sunday cleanliness drive volunteers needed",
      content: "Demo content. We are looking for 20 volunteers for the Sunday morning cleanliness drive at the community park. Bring your own water bottle; gloves and bags will be provided.",
      type: "CLEANLINESS_DRIVE",
      eventDate: new Date(Date.now() + 5 * 24 * 3600 * 1000),
      location: "Community park (demo)",
      areaId: loc("Benad Road")?.id,
      authorUserId: u1.id,
      status: "APPROVED",
      isDemo: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: randomUUID(),
      title: "[DEMO] Dengue awareness: keep containers dry",
      content: "Demo content. With the monsoon season, please empty coolers and flower pots weekly. Report stagnant water through the complaint form under Sewer/Drainage.",
      type: "AWARENESS",
      status: "APPROVED",
      isDemo: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: randomUUID(),
      title: "[DEMO] Pending post awaiting moderation",
      content: "Demo content. This post demonstrates the moderation queue — it is only visible in the admin panel until approved.",
      type: "ANNOUNCEMENT",
      authorUserId: u2.id,
      status: "PENDING",
      isDemo: true,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  return true;
}

export async function seedDatabase(opts: { demo?: boolean } = {}) {
  const ref = await seedReferenceData();
  const admin = await seedAdminFromEnv();
  const demo = opts.demo ? await seedDemoData() : false;
  return { referenceSeeded: ref, adminSeeded: admin, demoSeeded: demo };
}

/**
 * Called from instrumentation on server start; never throws.
 * Demo records are NEVER seeded in production — only when SEED_DEMO_DATA is
 * explicitly "true" (local development) or scripts/seed.ts is run with --demo.
 */
export async function seedIfEmpty() {
  try {
    const result = await seedDatabase({ demo: process.env.SEED_DEMO_DATA === "true" });
    if (result.referenceSeeded || result.adminSeeded || result.demoSeeded) console.info("[seed] completed", result);
  } catch (error) {
    console.error("[seed] skipped — database not ready?", (error as Error).message);
  }
}
