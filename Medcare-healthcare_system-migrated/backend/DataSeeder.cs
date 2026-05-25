using MedCare.Api.Data;
using MedCare.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace MedCare.Api;

/// <summary>
/// Comprehensive demo seeder for MedCare+ v7.
/// Idempotent — each section runs only if its table is empty.
/// Refreshes appointment dates to today on every startup.
/// </summary>
public static class DataSeeder
{
    private const int Bcrypt = 12;

    public static async Task SeedAsync(IServiceProvider services)
    {
        await using var scope = services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<MedCareDbContext>();
        await db.Database.EnsureCreatedAsync();

        var today = DateOnly.FromDateTime(DateTime.Now).ToString("yyyy-MM-dd");
        var now = DateTime.Now.ToString("yyyy-MM-ddTHH:mm:ss");
        var year = DateTime.Now.Year;

        Console.WriteLine("🌱 DataSeeder v7: checking each table...");

        // 1) ADMIN
        if (!await db.Admins.AnyAsync())
        {
            db.Admins.Add(new Admin
            {
                Username = "admin",
                Password = BCrypt.Net.BCrypt.HashPassword("Admin@123", Bcrypt),
                Role = "ADMIN",
            });
            await db.SaveChangesAsync();
            Console.WriteLine("   ✓ admin");
        }

        // 2) DOCTORS
        if (!await db.Doctors.AnyAsync())
        {
            var hash = BCrypt.Net.BCrypt.HashPassword("Doctor@123", Bcrypt);
            var data = new[]
            {
                ("Dr. Priya Sharma",  "Cardiologist",     "priya@medcare.in",  "9811000001", "Mon-Sat 9AM-2PM",  "12 years", "MD, DM Cardiology", "available", 4),
                ("Dr. Rahul Verma",   "Neurologist",      "rahul@medcare.in",  "9811000002", "Mon-Fri 10AM-4PM", "8 years",  "MD, DM Neurology",  "available", 3),
                ("Dr. Anjali Singh",  "Pediatrician",     "anjali@medcare.in", "9811000003", "Mon-Sat 9AM-1PM",  "10 years", "MD, DCH",           "in-operation", 5),
                ("Dr. Sameer Khan",   "Orthopedic",       "sameer@medcare.in", "9811000004", "Mon-Sat 11AM-5PM", "15 years", "MS Orthopaedics",   "available", 2),
                ("Dr. Meena Gupta",   "Gynecologist",     "meena@medcare.in",  "9811000005", "Tue-Sat 9AM-2PM",  "20 years", "MS Obstetrics",     "available", 6),
                ("Dr. Vikram Patel",  "General Medicine", "vikram@medcare.in", "9811000006", "Mon-Sat 8AM-2PM",  "6 years",  "MBBS, MD",          "available", 8),
            };
            foreach (var (n, s, e, p, sc, ex, q, av, ap) in data)
            {
                db.Doctors.Add(new Doctor
                {
                    Name = n, Specialization = s, Email = e, Phone = p, Schedule = sc,
                    Experience = ex, Qualification = q, Password = hash,
                    Role = "DOCTOR", AccountStatus = "active",
                    AvailabilityStatus = av, ActivePatients = ap,
                });
            }
            await db.SaveChangesAsync();
            Console.WriteLine("   ✓ 6 doctors");
        }

        // 3) PATIENTS
        if (!await db.Patients.AnyAsync())
        {
            var hash = BCrypt.Net.BCrypt.HashPassword("Patient@123", Bcrypt);
            var docs = await db.Doctors.ToListAsync();
            var data = new[]
            {
                ("Aakash Mehta",   34, "Male",   "9900010001", "A+",  "Penicillin",  $"MED{year}000001", "aakash",   "sunita", "tommy",  "mumbai",  "Mumbai, Maharashtra",  "Hypertension since 2021"),
                ("Divya Nair",     28, "Female", "9900010002", "B+",  "None",        $"MED{year}000002", "divya",    "latha",  "kitty",  "kochi",   "Kochi, Kerala",        "Type 2 Diabetes since 2022"),
                ("Suresh Reddy",   55, "Male",   "9900010003", "O+",  "Aspirin",     $"MED{year}000003", "suresh",   "radha",  "tommy",  "hyd",     "Hyderabad, Telangana", "COPD, smoking history"),
                ("Pooja Desai",    23, "Female", "9900010004", "AB+", "None",        $"MED{year}000004", "pooja",    "seema",  "fluffy", "surat",   "Surat, Gujarat",       "No significant history"),
                ("Rajesh Kumar",   42, "Male",   "9900010005", "O-",  "Sulfa drugs", $"MED{year}000005", "rajesh",   "kanta",  "bruno",  "delhi",   "Delhi",                "Hypothyroidism, on levothyroxine"),
                ("Sunita Sharma",  38, "Female", "9900010006", "B-",  "None",        $"MED{year}000006", "sunita_s", "prema",  "moti",   "pune",    "Pune, Maharashtra",    "PCOD managed since 2019"),
            };
            for (var i = 0; i < data.Length; i++)
            {
                var (n, age, g, c, bg, al, u, un, mn, pn, ht, addr, hist) = data[i];
                db.Patients.Add(new Patient
                {
                    Name = n, Age = age, Gender = g, Contact = c, BloodGroup = bg,
                    Allergies = al, Uhid = u, Username = un, MotherName = mn,
                    PetName = pn, HomeTown = ht, Password = hash, Role = "PATIENT",
                    LastVisit = today, Address = addr, History = hist,
                    PaymentCategory = "general", Nationality = "Indian",
                    DoctorId = docs[i % docs.Count].Id,
                });
            }
            await db.SaveChangesAsync();
            Console.WriteLine("   ✓ 6 patients");
        }

        // 4) APPOINTMENTS — always refresh today's date
        var staleAppts = await db.Appointments.Where(a => a.Date != today).ToListAsync();
        if (staleAppts.Count > 0)
        {
            staleAppts.ForEach(a => a.Date = today);
            await db.SaveChangesAsync();
            Console.WriteLine($"   ✓ refreshed {staleAppts.Count} appointment dates");
        }
        if (!await db.Appointments.AnyAsync())
        {
            var docs = await db.Doctors.ToListAsync();
            var pats = await db.Patients.ToListAsync();
            var apptData = new[]
            {
                (0, 0, "emergency",  "09:00", "Chest pain radiating to left arm, shortness of breath", 1),
                (1, 1, "walkin",     "09:30", "Severe headache and dizziness for 3 days",              2),
                (2, 2, "scheduled",  "10:00", "High fever 102F with sore throat",                       3),
                (3, 3, "walkin",     "10:30", "Lower back pain after lifting",                         2),
                (4, 4, "scheduled",  "11:00", "Persistent cough for 2 weeks",                          3),
                (5, 5, "walkin",     "11:30", "Routine diabetes and thyroid follow-up",                3),
            };
            foreach (var (pi, di, type, time, complaint, pri) in apptData)
            {
                db.Appointments.Add(new Appointment
                {
                    PatientId = pats[pi].Id, DoctorId = docs[di].Id, Type = type,
                    Status = "waiting", Date = today, Time = time,
                    Complaint = complaint, Priority = pri, Uhid = pats[pi].Uhid,
                });
            }
            await db.SaveChangesAsync();
            Console.WriteLine("   ✓ 6 appointments");
        }

        // 5) MEDICINES
        if (!await db.Medicines.AnyAsync())
        {
            var meds = new[]
            {
                new Medicine { Name="Paracetamol 500mg",     BrandName="Calpol",    Category="tablet",    Composition="Paracetamol 500mg",         UnitPrice=2.5,   StockQuantity=4985, ReorderLevel=500, ExpiryDate="2027-12-31", Active=true, CreatedAt=now, UpdatedAt=now },
                new Medicine { Name="Amoxicillin 500mg",     BrandName="Mox",       Category="capsule",   Composition="Amoxicillin trihydrate",     UnitPrice=8.0,   StockQuantity=1986, ReorderLevel=200, ExpiryDate="2027-06-30", Active=true, CreatedAt=now, UpdatedAt=now },
                new Medicine { Name="Metformin 500mg",       BrandName="Glycomet",  Category="tablet",    Composition="Metformin HCl 500mg",       UnitPrice=3.5,   StockQuantity=2970, ReorderLevel=300, ExpiryDate="2027-09-30", Active=true, CreatedAt=now, UpdatedAt=now },
                new Medicine { Name="Atorvastatin 10mg",     BrandName="Lipitor",   Category="tablet",    Composition="Atorvastatin calcium",      UnitPrice=12.0,  StockQuantity=1470, ReorderLevel=150, ExpiryDate="2027-12-31", Active=true, CreatedAt=now, UpdatedAt=now },
                new Medicine { Name="Pantoprazole 40mg",     BrandName="Pan-D",     Category="tablet",    Composition="Pantoprazole sodium",       UnitPrice=6.5,   StockQuantity=2500, ReorderLevel=250, ExpiryDate="2027-10-31", Active=true, CreatedAt=now, UpdatedAt=now },
                new Medicine { Name="Cetirizine 10mg",       BrandName="Cetriz",    Category="tablet",    Composition="Cetirizine HCl 10mg",       UnitPrice=4.0,   StockQuantity=8,    ReorderLevel=50,  ExpiryDate="2027-12-31", Active=true, CreatedAt=now, UpdatedAt=now },
                new Medicine { Name="Normal Saline 500ml",   BrandName="B.Braun",   Category="injection", Composition="Sodium Chloride 0.9%",      UnitPrice=35.0,  StockQuantity=200,  ReorderLevel=50,  ExpiryDate="2027-03-31", Active=true, CreatedAt=now, UpdatedAt=now },
                new Medicine { Name="Azithromycin 500mg",    BrandName="Zithromax", Category="tablet",    Composition="Azithromycin dihydrate",    UnitPrice=22.0,  StockQuantity=795,  ReorderLevel=100, ExpiryDate="2027-08-31", Active=true, CreatedAt=now, UpdatedAt=now },
                new Medicine { Name="Amlodipine 5mg",        BrandName="Norvasc",   Category="tablet",    Composition="Amlodipine besylate",       UnitPrice=5.5,   StockQuantity=1200, ReorderLevel=100, ExpiryDate="2027-11-30", Active=true, CreatedAt=now, UpdatedAt=now },
                new Medicine { Name="Insulin Glargine 100U", BrandName="Lantus",    Category="injection", Composition="Insulin glargine 100 U/mL", UnitPrice=850.0, StockQuantity=50,   ReorderLevel=10,  ExpiryDate="2027-06-30", Active=true, CreatedAt=now, UpdatedAt=now },
            };
            db.Medicines.AddRange(meds);
            await db.SaveChangesAsync();
            Console.WriteLine("   ✓ 10 medicines");
        }

        var allMeds = await db.Medicines.ToListAsync();
        var allDocs = await db.Doctors.ToListAsync();
        var allPats = await db.Patients.ToListAsync();

        // 6) PRESCRIPTIONS
        if (!await db.Prescriptions.AnyAsync() && allPats.Count >= 3)
        {
            db.Prescriptions.AddRange(
                new Prescription
                {
                    PatientId = allPats[0].Id, DoctorId = allDocs[0].Id, Date = today,
                    Medicines = "Paracetamol 500mg\nAmoxicillin 500mg",
                    Dosage = "Paracetamol: 1 tab TDS after food\nAmoxicillin: 1 cap BD",
                    Duration = "Paracetamol: 5 days\nAmoxicillin: 7 days",
                    Tests = "CBC, CRP, ECG, 2D Echo",
                    Diet = "Plenty of fluids. Avoid alcohol. Rest.",
                    Notes = "Follow up after 1 week. Emergency if chest pain worsens.",
                },
                new Prescription
                {
                    PatientId = allPats[1].Id, DoctorId = allDocs[1].Id, Date = today,
                    Medicines = "Metformin 500mg\nAtorvastatin 10mg\nAmlodipine 5mg",
                    Dosage = "Metformin: 1 tab BD with meals\nAtorvastatin: 1 tab at night\nAmlodipine: 1 tab OD",
                    Duration = "All medicines: 30 days",
                    Tests = "HbA1c, Lipid Profile, LFT, KFT",
                    Diet = "Low sugar, low fat. 30-min walk daily.",
                    Notes = "Monitor blood sugar daily. Recheck after 2 weeks.",
                },
                new Prescription
                {
                    PatientId = allPats[2].Id, DoctorId = allDocs[2].Id, Date = today,
                    Medicines = "Azithromycin 500mg\nPantoprazole 40mg",
                    Dosage = "Azithromycin: 1 tab OD 1 hr before food\nPantoprazole: 1 tab before breakfast",
                    Duration = "Azithromycin: 5 days\nPantoprazole: 14 days",
                    Tests = "Widal, Dengue NS1, CBC",
                    Diet = "Light diet. Avoid street food.",
                    Notes = "Report if fever > 103°F or rash develops.",
                });
            await db.SaveChangesAsync();
            Console.WriteLine("   ✓ 3 prescriptions");
        }

        // 7) BILLS
        if (!await db.Bills.AnyAsync() && allPats.Count >= 4)
        {
            var invBase = $"INV-{DateTime.Now:yyyyMMdd}";
            db.Bills.AddRange(
                new Bill
                {
                    PatientId = allPats[0].Id, DoctorId = allDocs[0].Id,
                    InvoiceNumber = $"{invBase}-001", BillDate = today,
                    Description = "Emergency Cardiology Consultation + ECG + Echo",
                    ConsultationFee = 1000, MedicineCost = 350, LabTestCost = 800, OtherCharges = 200,
                    TotalAmount = 2350, InsuranceCovered = 0, AmountPayable = 2350, Status = "pending",
                },
                new Bill
                {
                    PatientId = allPats[1].Id, DoctorId = allDocs[1].Id,
                    InvoiceNumber = $"{invBase}-002", BillDate = today,
                    Description = "Neurology Consultation + MRI Brain (with contrast)",
                    ConsultationFee = 1200, MedicineCost = 850, LabTestCost = 5000, OtherCharges = 0,
                    TotalAmount = 7050, InsuranceCovered = 2000, AmountPayable = 5050,
                    Status = "paid", PaymentMethod = "upi", PaymentDate = today, TransactionRef = "TXN-UPI-20001",
                },
                new Bill
                {
                    PatientId = allPats[2].Id, DoctorId = allDocs[2].Id,
                    InvoiceNumber = $"{invBase}-003", BillDate = today,
                    Description = "Pediatric Consultation + Dengue NS1 + CBC",
                    ConsultationFee = 600, MedicineCost = 280, LabTestCost = 800, OtherCharges = 0,
                    TotalAmount = 1680, InsuranceCovered = 500, AmountPayable = 1180, Status = "pending",
                },
                new Bill
                {
                    PatientId = allPats[3].Id, DoctorId = allDocs[3].Id,
                    InvoiceNumber = $"{invBase}-004", BillDate = today,
                    Description = "Orthopedic Consultation + X-Ray Lumbar Spine",
                    ConsultationFee = 800, MedicineCost = 0, LabTestCost = 0, OtherCharges = 450,
                    TotalAmount = 1250, InsuranceCovered = 0, AmountPayable = 1250,
                    Status = "paid", PaymentMethod = "card", PaymentDate = today, TransactionRef = "TXN-CARD-30002",
                });
            await db.SaveChangesAsync();
            Console.WriteLine("   ✓ 4 bills");
        }

        // 8) LAB TESTS
        if (!await db.LabTests.AnyAsync() && allPats.Count >= 5)
        {
            db.LabTests.AddRange(
                new LabTest
                {
                    PatientId = allPats[0].Id, Uhid = allPats[0].Uhid!, DoctorId = allDocs[0].Id,
                    TestName = "Complete Blood Count", TestCode = "CBC", Category = "haematology",
                    SampleType = "blood", Priority = "stat", Status = "completed",
                    Charges = 300, OrderedAt = now,
                    SampleCollectedAt = now, SampleCollectedBy = "Lab Tech Ramesh",
                    Result = "Hb: 11.2 g/dL (Low)\nWBC: 12,400/µL (High)\nPlatelets: 180,000/µL\nNeutrophils: 78%",
                    ReferenceRange = "Hb: 13-17 g/dL | WBC: 4000-11000 | Platelets: 150000-400000",
                    ResultEnteredAt = now, ResultEnteredBy = "Dr. Pathologist",
                },
                new LabTest
                {
                    PatientId = allPats[1].Id, Uhid = allPats[1].Uhid!, DoctorId = allDocs[1].Id,
                    TestName = "HbA1c", TestCode = "HBA1C", Category = "biochemistry",
                    SampleType = "blood", Priority = "routine", Status = "completed",
                    Charges = 500, OrderedAt = now,
                    SampleCollectedAt = now, SampleCollectedBy = "Lab Tech Priya",
                    Result = "HbA1c: 8.2% (Poorly controlled diabetes)\nEAG: 189 mg/dL",
                    ReferenceRange = "Normal < 5.7% | Diabetes ≥ 6.5% | Target < 7%",
                    ResultEnteredAt = now, ResultEnteredBy = "Dr. Pathologist",
                },
                new LabTest
                {
                    PatientId = allPats[2].Id, Uhid = allPats[2].Uhid!, DoctorId = allDocs[2].Id,
                    TestName = "Dengue NS1 Antigen", TestCode = "DENGUE_NS1", Category = "serology",
                    SampleType = "blood", Priority = "urgent", Status = "sample-collected",
                    Charges = 800, OrderedAt = now,
                    SampleCollectedAt = now, SampleCollectedBy = "Lab Tech Anita",
                },
                new LabTest
                {
                    PatientId = allPats[3].Id, Uhid = allPats[3].Uhid!, DoctorId = allDocs[3].Id,
                    TestName = "Lipid Profile", TestCode = "LIPID_PROFILE", Category = "biochemistry",
                    SampleType = "blood", Priority = "routine", Status = "ordered",
                    Charges = 700, OrderedAt = now,
                },
                new LabTest
                {
                    PatientId = allPats[4].Id, Uhid = allPats[4].Uhid!, DoctorId = allDocs[4].Id,
                    TestName = "Thyroid Profile (TSH,T3,T4)", TestCode = "THYROID", Category = "biochemistry",
                    SampleType = "blood", Priority = "routine", Status = "ordered",
                    Charges = 750, OrderedAt = now,
                });
            await db.SaveChangesAsync();
            Console.WriteLine("   ✓ 5 lab tests");
        }

        // 9) RADIOLOGY
        if (!await db.RadiologyOrders.AnyAsync() && allPats.Count >= 5)
        {
            var pacsBase = $"RAD{DateTime.Now:yyyyMMdd}";
            db.RadiologyOrders.AddRange(
                new RadiologyOrder
                {
                    PatientId = allPats[0].Id, Uhid = allPats[0].Uhid!, DoctorId = allDocs[0].Id,
                    ImagingType = "xray", BodyPart = "Chest PA View", Contrast = "none",
                    Priority = "stat", Status = "reported", Charges = 400, OrderedAt = now,
                    PacsAccessionNumber = $"{pacsBase}001",
                    Findings = "Cardiomegaly present. CTR 0.58. No consolidation. No pleural effusion. Normal lung vascularity.",
                    Impression = "Cardiomegaly — suggest 2D Echocardiography. Clinical correlation advised.",
                    ReportedAt = now, ReportedBy = "Dr. Radiologist",
                },
                new RadiologyOrder
                {
                    PatientId = allPats[1].Id, Uhid = allPats[1].Uhid!, DoctorId = allDocs[1].Id,
                    ImagingType = "mri", BodyPart = "Brain with contrast", Contrast = "with-contrast",
                    Priority = "urgent", Status = "imaging-done", Charges = 5000, OrderedAt = now,
                    PacsAccessionNumber = $"{pacsBase}002",
                },
                new RadiologyOrder
                {
                    PatientId = allPats[3].Id, Uhid = allPats[3].Uhid!, DoctorId = allDocs[3].Id,
                    ImagingType = "xray", BodyPart = "Lumbar Spine AP + Lateral", Contrast = "none",
                    Priority = "routine", Status = "reported", Charges = 450, OrderedAt = now,
                    PacsAccessionNumber = $"{pacsBase}003",
                    Findings = "Disc space narrowing at L4-L5 and L5-S1. End plate sclerosis. No fracture.",
                    Impression = "Degenerative disc disease L4-L5, L5-S1. MRI recommended.",
                    ReportedAt = now, ReportedBy = "Dr. Radiologist",
                },
                new RadiologyOrder
                {
                    PatientId = allPats[4].Id, Uhid = allPats[4].Uhid!, DoctorId = allDocs[4].Id,
                    ImagingType = "ultrasound", BodyPart = "Abdomen & Pelvis", Contrast = "none",
                    Priority = "routine", Status = "ordered", Charges = 900, OrderedAt = now,
                    PacsAccessionNumber = $"{pacsBase}004",
                });
            await db.SaveChangesAsync();
            Console.WriteLine("   ✓ 4 radiology orders");
        }

        // 10) DISPENSE RECORDS
        if (!await db.DispenseRecords.AnyAsync() && allMeds.Count >= 8 && allPats.Count >= 3)
        {
            db.DispenseRecords.AddRange(
                new DispenseRecord { PatientId=allPats[0].Id, Uhid=allPats[0].Uhid!, MedicineId=allMeds[0].Id, MedicineName=allMeds[0].Name, Quantity=15, UnitPrice=allMeds[0].UnitPrice, TotalPrice=15*allMeds[0].UnitPrice, DispensedAt=now, DispensedBy="Pharmacy Staff", Status="dispensed" },
                new DispenseRecord { PatientId=allPats[0].Id, Uhid=allPats[0].Uhid!, MedicineId=allMeds[1].Id, MedicineName=allMeds[1].Name, Quantity=14, UnitPrice=allMeds[1].UnitPrice, TotalPrice=14*allMeds[1].UnitPrice, DispensedAt=now, DispensedBy="Pharmacy Staff", Status="dispensed" },
                new DispenseRecord { PatientId=allPats[1].Id, Uhid=allPats[1].Uhid!, MedicineId=allMeds[2].Id, MedicineName=allMeds[2].Name, Quantity=30, UnitPrice=allMeds[2].UnitPrice, TotalPrice=30*allMeds[2].UnitPrice, DispensedAt=now, DispensedBy="Pharmacy Staff", Status="dispensed" },
                new DispenseRecord { PatientId=allPats[1].Id, Uhid=allPats[1].Uhid!, MedicineId=allMeds[3].Id, MedicineName=allMeds[3].Name, Quantity=30, UnitPrice=allMeds[3].UnitPrice, TotalPrice=30*allMeds[3].UnitPrice, DispensedAt=now, DispensedBy="Pharmacy Staff", Status="dispensed" },
                new DispenseRecord { PatientId=allPats[2].Id, Uhid=allPats[2].Uhid!, MedicineId=allMeds[7].Id, MedicineName=allMeds[7].Name, Quantity=5,  UnitPrice=allMeds[7].UnitPrice, TotalPrice=5 *allMeds[7].UnitPrice, DispensedAt=now, DispensedBy="Pharmacy Staff", Status="dispensed" });
            await db.SaveChangesAsync();
            Console.WriteLine("   ✓ 5 dispense records");
        }

        // 11) TRIAGE
        if (!await db.Triages.AnyAsync() && allPats.Count >= 6)
        {
            db.Triages.AddRange(
                new Triage
                {
                    PatientId = allPats[0].Id, Uhid = allPats[0].Uhid,
                    PatientName = "Aakash Mehta", PatientAge = "34y", PatientGender = "Male",
                    ContactNumber = "9900010001",
                    ChiefComplaint = "Sudden chest pain radiating to left arm, sweating, breathlessness",
                    TriageCategory = 1, BloodPressure = "158/96", Pulse = "112",
                    Temperature = "98.4", SpO2 = "94%", RespiratoryRate = "22/min", GcsScore = "15",
                    ModeOfArrival = "ambulance", Status = "triaged", TriageTime = now,
                },
                new Triage
                {
                    PatientName = "Walk-In Trauma Patient", PatientAge = "45y", PatientGender = "Male",
                    ContactNumber = "9988776655",
                    ChiefComplaint = "Road traffic accident — head injury, multiple abrasions",
                    TriageCategory = 2, BloodPressure = "140/90", Pulse = "98",
                    Temperature = "99.1", SpO2 = "97%", RespiratoryRate = "18/min", GcsScore = "13",
                    ModeOfArrival = "ambulance", Status = "triaged", TriageTime = now,
                },
                new Triage
                {
                    PatientId = allPats[5].Id, Uhid = allPats[5].Uhid,
                    PatientName = "Sunita Sharma", PatientAge = "38y", PatientGender = "Female",
                    ContactNumber = "9900010006",
                    ChiefComplaint = "High fever 103°F with chills for 2 days",
                    TriageCategory = 3, BloodPressure = "110/70", Pulse = "104",
                    Temperature = "103.0", SpO2 = "98%", RespiratoryRate = "20/min",
                    ModeOfArrival = "walk-in", Status = "triaged", TriageTime = now,
                });
            await db.SaveChangesAsync();
            Console.WriteLine("   ✓ 3 triage entries");
        }

        // 12) INSURANCE
        if (!await db.Insurances.AnyAsync() && allPats.Count >= 3)
        {
            db.Insurances.AddRange(
                new Insurance
                {
                    PatientId = allPats[1].Id,
                    ProviderName = "Star Health Insurance", PolicyNumber = "SHI-2024-001234",
                    PolicyHolderName = allPats[1].Name, ValidFrom = "2024-01-01", ValidTo = "2024-12-31",
                    SumInsured = 500000, AmountUsed = 2000, CoverageType = "family",
                    ContactNumber = "1800-425-2255", TpaName = "Star Health TPA",
                },
                new Insurance
                {
                    PatientId = allPats[2].Id,
                    ProviderName = "ICICI Lombard", PolicyNumber = "ICICI-2024-005678",
                    PolicyHolderName = allPats[2].Name, ValidFrom = "2024-04-01", ValidTo = "2025-03-31",
                    SumInsured = 300000, AmountUsed = 500, CoverageType = "individual",
                    ContactNumber = "1800-2666", TpaName = "Medi Assist TPA",
                });
            await db.SaveChangesAsync();
            Console.WriteLine("   ✓ 2 insurance records");
        }

        // 13) LEAVES
        if (!await db.Leaves.AnyAsync() && allDocs.Count >= 3)
        {
            db.Leaves.Add(new Leave
            {
                DoctorId = allDocs[2].Id,
                FromDate = DateOnly.FromDateTime(DateTime.Now.AddDays(5)).ToString("yyyy-MM-dd"),
                ToDate   = DateOnly.FromDateTime(DateTime.Now.AddDays(7)).ToString("yyyy-MM-dd"),
                Reason = "National Pediatrics Summit — Mumbai (CME credit)",
                Status = "pending", AppliedDate = today,
            });
            await db.SaveChangesAsync();
            Console.WriteLine("   ✓ 1 leave request");
        }

        // 14) AUDIT
        if (!await db.AuditLogs.AnyAsync())
        {
            db.AuditLogs.AddRange(
                new AuditLog { Action = "System initialized — MedCare+ v7", PerformedBy = "system",  Timestamp = now },
                new AuditLog { Action = "Admin login: admin",                PerformedBy = "admin",   Timestamp = now });
            await db.SaveChangesAsync();
        }

        Console.WriteLine($"✅ DataSeeder v7: complete for {today}");
    }
}
