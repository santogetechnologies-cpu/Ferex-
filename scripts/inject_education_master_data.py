import json
import urllib.request
import uuid
import os
import sys

# Load .env
env = {}
with open('.env', 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, v = line.split('=', 1)
            env[k.strip()] = v.strip().strip('"').strip("'")

url = env.get('VITE_SUPABASE_URL')
anon_key = env.get('VITE_SUPABASE_ANON_KEY')

headers = {
    'apikey': anon_key,
    'Authorization': f'Bearer {anon_key}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}

def supabase_get(table, select='*'):
    req = urllib.request.Request(f"{url}/rest/v1/{table}?select={select}", headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        print(f"Error reading {table}: {e}")
        return []

def supabase_insert(table, records):
    if not records:
        return []
    # Send in batches of 50
    inserted = []
    for i in range(0, len(records), 50):
        batch = records[i:i+50]
        data = json.dumps(batch).encode('utf-8')
        req = urllib.request.Request(f"{url}/rest/v1/{table}", headers=headers, data=data, method='POST')
        try:
            with urllib.request.urlopen(req) as resp:
                res = json.loads(resp.read().decode('utf-8'))
                inserted.extend(res)
                print(f"  Inserted batch of {len(batch)} into {table} (status: {resp.status})")
        except urllib.error.HTTPError as e:
            err_body = e.read().decode('utf-8')
            print(f"  HTTPError inserting into {table}: {e.code} - {err_body}")
        except Exception as e:
            print(f"  Error inserting into {table}: {e}")
    return inserted

# ─────────────────────────────────────────────────────────────────────────────
# 1. DESTINATIONS
# ─────────────────────────────────────────────────────────────────────────────
DESTINATIONS = [
    {
        "name": "Lithuania", "code": "LT", "flag": "🇱🇹", "currency": "EUR",
        "authority": "MIGRIS Migration Department & SKVC", "acronym": "MIGRIS/SKVC",
        "processing": "3-6 Weeks", "fee": "€120 (~₹10,800)", "desk": "Vilnius/Kaunas", "badge": "Schengen EU", "is_active": True
    },
    {
        "name": "Poland", "code": "PL", "flag": "🇵🇱", "currency": "PLN",
        "authority": "Polish National Agency for Academic Exchange", "acronym": "NAWA",
        "processing": "2-4 Weeks", "fee": "€80 (~₹7,200)", "desk": "Warsaw Desk", "badge": "Schengen EU", "is_active": True
    },
    {
        "name": "United Kingdom", "code": "GB", "flag": "🇬🇧", "currency": "GBP",
        "authority": "UK Visas and Immigration", "acronym": "UKVI",
        "processing": "3-4 Weeks", "fee": "£490 (~₹51,450)", "desk": "London/Manchester Desk", "badge": "UK Tier 4 / Student", "is_active": True
    },
    {
        "name": "Albania", "code": "AL", "flag": "🇦🇱", "currency": "EUR",
        "authority": "Ministry for Europe and Foreign Affairs (E-Visa)", "acronym": "MEFA",
        "processing": "2-3 Weeks", "fee": "€50 (~₹4,500)", "desk": "Tirana Desk", "badge": "EU Candidate / Low Cost", "is_active": True
    },
    {
        "name": "Moldova", "code": "MD", "flag": "🇲🇩", "currency": "EUR",
        "authority": "General Inspectorate for Migration (BMA)", "acronym": "GIM",
        "processing": "2-4 Weeks", "fee": "€80 (~₹7,200)", "desk": "Chisinau Desk", "badge": "EU Candidate / Affordable", "is_active": True
    },
    {
        "name": "Bulgaria", "code": "BG", "flag": "🇧🇬", "currency": "EUR",
        "authority": "Ministry of Foreign Affairs (Consular Relations)", "acronym": "MFA Bulgaria",
        "processing": "4-6 Weeks", "fee": "€100 (~₹9,000)", "desk": "Sofia Desk", "badge": "Schengen EU / Medical", "is_active": True
    },
    {
        "name": "Latvia", "code": "LV", "flag": "🇱🇻", "currency": "EUR",
        "authority": "Office of Citizenship and Migration Affairs", "acronym": "PMLP/AIC",
        "processing": "3-5 Weeks", "fee": "€80 (~₹7,200)", "desk": "Riga Desk", "badge": "Schengen EU", "is_active": True
    },
    {
        "name": "Hungary", "code": "HU", "flag": "🇭🇺", "currency": "EUR",
        "authority": "National Directorate-General for Aliens Policing", "acronym": "OIF",
        "processing": "3-5 Weeks", "fee": "€110 (~₹9,900)", "desk": "Budapest Desk", "badge": "Schengen EU", "is_active": True
    },
    {
        "name": "Montenegro", "code": "ME", "flag": "🇲🇪", "currency": "EUR",
        "authority": "Ministry of Interior (MUP)", "acronym": "MUP",
        "processing": "2-4 Weeks", "fee": "€35 (~₹3,150)", "desk": "Podgorica Desk", "badge": "Balkan / Low Cost", "is_active": True
    },
    {
        "name": "Georgia", "code": "GE", "flag": "🇬🇪", "currency": "USD",
        "authority": "Consular Department MFA Georgia (E-Visa D3)", "acronym": "MFA Georgia",
        "processing": "2-3 Weeks", "fee": "$50 (~₹4,200)", "desk": "Tbilisi Desk", "badge": "Caucasus / Medical", "is_active": True
    },
    {
        "name": "Malta", "code": "MT", "flag": "🇲🇹", "currency": "EUR",
        "authority": "Identità Malta Agency", "acronym": "Identità",
        "processing": "4-8 Weeks", "fee": "€100 (~₹9,000)", "desk": "Valletta Desk", "badge": "Schengen / English Speaking", "is_active": True
    },
    {
        "name": "Greece", "code": "GR", "flag": "🇬🇷", "currency": "EUR",
        "authority": "Hellenic Ministry of Foreign Affairs", "acronym": "MFA Greece",
        "processing": "4-6 Weeks", "fee": "€180 (~₹16,200)", "desk": "Athens Desk", "badge": "Schengen EU", "is_active": True
    },
    {
        "name": "Mauritius", "code": "MU", "flag": "🇲🇺", "currency": "USD",
        "authority": "Passport and Immigration Office Mauritius", "acronym": "PIO",
        "processing": "2-4 Weeks", "fee": "Free / $50 (~₹4,200)", "desk": "Port Louis Desk", "badge": "Indian Ocean / Hassle Free", "is_active": True
    },
    {
        "name": "Malaysia", "code": "MY", "flag": "🇲🇾", "currency": "MYR",
        "authority": "Education Malaysia Global Services", "acronym": "EMGS",
        "processing": "3-5 Weeks", "fee": "2,000 MYR (~₹38,000)", "desk": "Kuala Lumpur Desk", "badge": "SE Asia / Affordable", "is_active": True
    },
    {
        "name": "Germany", "code": "DE", "flag": "🇩🇪", "currency": "EUR",
        "authority": "Federal Foreign Office & Ausländerbehörde", "acronym": "BAMF/APS",
        "processing": "4-8 Weeks", "fee": "€75 (~₹6,750)", "desk": "Berlin Desk", "badge": "Schengen EU / Tech Hub", "is_active": True
    },
    {
        "name": "Finland", "code": "FI", "flag": "🇫🇮", "currency": "EUR",
        "authority": "Finnish Immigration Service (Enter Finland)", "acronym": "Migri",
        "processing": "3-6 Weeks", "fee": "€350 (~₹31,500)", "desk": "Helsinki Desk", "badge": "Nordic / High Standard", "is_active": True
    },
    {
        "name": "France", "code": "FR", "flag": "🇫🇷", "currency": "EUR",
        "authority": "Campus France & France-Visas", "acronym": "Campus France",
        "processing": "3-5 Weeks", "fee": "€50 + ₹18,000 CF", "desk": "Paris Desk", "badge": "Schengen EU", "is_active": True
    },
    {
        "name": "Ireland", "code": "IE", "flag": "🇮🇪", "currency": "EUR",
        "authority": "Irish Immigration Service Delivery", "acronym": "ISD",
        "processing": "4-8 Weeks", "fee": "€100 (~₹9,000)", "desk": "Dublin Desk", "badge": "EU / English Speaking", "is_active": True
    },
    {
        "name": "Sweden", "code": "SE", "flag": "🇸🇪", "currency": "SEK",
        "authority": "Swedish Migration Agency", "acronym": "Migrationsverket",
        "processing": "4-8 Weeks", "fee": "1,500 SEK (~₹12,000)", "desk": "Stockholm Desk", "badge": "Nordic / Innovation", "is_active": True
    },
    {
        "name": "Australia", "code": "AU", "flag": "🇦🇺", "currency": "AUD",
        "authority": "Department of Home Affairs (Subclass 500)", "acronym": "DoHA",
        "processing": "4-8 Weeks", "fee": "AUD 1,600 (~₹88,000)", "desk": "Sydney/Melbourne Desk", "badge": "Post Study Work Rights", "is_active": True
    },
    {
        "name": "New Zealand", "code": "NZ", "flag": "🇳🇿", "currency": "NZD",
        "authority": "Immigration New Zealand", "acronym": "INZ",
        "processing": "4-6 Weeks", "fee": "NZD 375 (~₹19,000)", "desk": "Auckland Desk", "badge": "Pacific / Quality Education", "is_active": True
    }
]

# ─────────────────────────────────────────────────────────────────────────────
# 2. UNIVERSITIES (High Quality, Low Tuition for Indian Students, Real Data)
# ─────────────────────────────────────────────────────────────────────────────
UNIVERSITIES = [
    # ── LITHUANIA ── (September 2027 Intake & Current)
    # Open Now: From November 01, 2026
    {
        "name": "Vytautas Magnus University (VMU)",
        "country": "Lithuania",
        "city": "Kaunas",
        "ranking": 2,
        "rating": 4.9,
        "badge": "Admissions Open Now (Sept 2027)",
        "category": "Comprehensive Research University",
        "description": "Leading Lithuanian classical university. Ranked in QS World Rankings. English-taught programs in Informatics, Business, International Politics, and Biotechnology. Affordable tuition with campus dorms from €70/mo.",
        "tuition_range": "€3,000 - €4,500 / yr",
        "university_fee": "€3,200",
        "tuition_fee_currency": "EUR",
        "tuition_fee_min": 3000,
        "tuition_fee_max": 4500,
        "tuition_fee_eur": 3200,
        "tuition_fee_inr": 288000,
        "tuition_fee_enabled": True,
        "vfs_fee": "€120 (~₹10,800) + VFS ₹1,581",
        "living_cost_monthly": "€250 - €400 / mo (Dorm: €70 - €120/mo)",
        "programs": ["Informatics / Computer Science (BSc)", "International Business & Communication (BA)", "Biotechnology (BSc)", "Applied Informatics (MSc)", "Finance & Banking (MSc)"],
        "intakes": ["September 2027 (Open Nov 01, 2026)", "February 2027", "September 2026"],
        "nawa_required": False,
        "is_active": True
    },
    {
        "name": "Lithuanian University of Health Sciences (LSMU)",
        "country": "Lithuania",
        "city": "Kaunas",
        "ranking": 1,
        "rating": 4.9,
        "badge": "Admissions Open Now (Sept 2027)",
        "category": "Medical & Health Sciences University",
        "description": "Lithuania's premier university for medical, dental, and veterinary studies. WHO, NMC, and EU accredited. Highly popular among Indian students for Medicine, Dentistry, Nursing, and Pharmacy.",
        "tuition_range": "€4,500 - €8,000 / yr",
        "university_fee": "€5,000",
        "tuition_fee_currency": "EUR",
        "tuition_fee_min": 4500,
        "tuition_fee_max": 8000,
        "tuition_fee_eur": 5000,
        "tuition_fee_inr": 450000,
        "tuition_fee_enabled": True,
        "vfs_fee": "€120 (~₹10,800) + VFS ₹1,581",
        "living_cost_monthly": "€300 - €450 / mo",
        "programs": ["General Medicine (MD - 6 yrs)", "Dental Medicine (BDS/DDS - 5 yrs)", "Nursing & Midwifery (BSc)", "Pharmacy (MPharm)", "Veterinary Medicine"],
        "intakes": ["September 2027 (Open Nov 01, 2026)", "September 2026"],
        "nawa_required": False,
        "is_active": True
    },
    {
        "name": "Mykolas Romeris University (MRU)",
        "country": "Lithuania",
        "city": "Vilnius",
        "ranking": 4,
        "rating": 4.8,
        "badge": "Admissions Open Now (Sept 2027)",
        "category": "Social Sciences & Business University",
        "description": "Public university in Vilnius specializing in Law, Business Management, Cybersecurity Management, and Informatics. Low living cost and strong student placement support.",
        "tuition_range": "€3,100 - €4,200 / yr",
        "university_fee": "€3,200",
        "tuition_fee_currency": "EUR",
        "tuition_fee_min": 3100,
        "tuition_fee_max": 4200,
        "tuition_fee_eur": 3200,
        "tuition_fee_inr": 288000,
        "tuition_fee_enabled": True,
        "vfs_fee": "€120 (~₹10,800) + VFS ₹1,581",
        "living_cost_monthly": "€280 - €420 / mo",
        "programs": ["Informatics and Digital Contents (BSc)", "Cybersecurity Management (BSc)", "Global Business & Modern Marketing (BA)", "International Law (LLM)", "Financial Management (MSc)"],
        "intakes": ["September 2027 (Open Nov 01, 2026)", "February 2027"],
        "nawa_required": False,
        "is_active": True
    },
    {
        "name": "Lithuanian Sports University (LSU)",
        "country": "Lithuania",
        "city": "Kaunas",
        "ranking": 6,
        "rating": 4.7,
        "badge": "Admissions Open Now (Sept 2027)",
        "category": "Sports Science & Physiotherapy",
        "description": "Specialized state university dedicated to Sports Science, Physiotherapy, Coaching, and Physical Activity. Exceptional modern laboratories and clinical attachments across the EU.",
        "tuition_range": "€2,800 - €3,800 / yr",
        "university_fee": "€3,000",
        "tuition_fee_currency": "EUR",
        "tuition_fee_min": 2800,
        "tuition_fee_max": 3800,
        "tuition_fee_eur": 3000,
        "tuition_fee_inr": 270000,
        "tuition_fee_enabled": True,
        "vfs_fee": "€120 (~₹10,800) + VFS ₹1,581",
        "living_cost_monthly": "€250 - €380 / mo",
        "programs": ["Physiotherapy (BSc)", "Sports Coaching (BSc)", "Physical Activity & Public Health (MSc)", "Sports Management (MSc)"],
        "intakes": ["September 2027 (Open Nov 01, 2026)", "September 2026"],
        "nawa_required": False,
        "is_active": True
    },
    {
        "name": "Kaunas University of Technology (KTU)",
        "country": "Lithuania",
        "city": "Kaunas",
        "ranking": 3,
        "rating": 4.9,
        "badge": "Admissions Open Now (Sept 2027)",
        "category": "Premier Technical University",
        "description": "Largest technical university in the Baltic states. Global leader in Engineering, Computer Science, Artificial Intelligence, and Architecture. Strong internship linkages with European tech firms.",
        "tuition_range": "€3,200 - €4,800 / yr",
        "university_fee": "€3,500",
        "tuition_fee_currency": "EUR",
        "tuition_fee_min": 3200,
        "tuition_fee_max": 4800,
        "tuition_fee_eur": 3500,
        "tuition_fee_inr": 315000,
        "tuition_fee_enabled": True,
        "vfs_fee": "€120 (~₹10,800) + VFS ₹1,581",
        "living_cost_monthly": "€260 - €420 / mo",
        "programs": ["Artificial Intelligence & Data Science (BSc)", "Software Systems (BSc)", "Mechanical Engineering (BSc)", "Mechatronics (BSc/MSc)", "Industrial Engineering & Management (MSc)"],
        "intakes": ["September 2027 (Open Nov 01, 2026)", "February 2027", "September 2026"],
        "nawa_required": False,
        "is_active": True
    },
    # Upcoming: From December 01, 2026
    {
        "name": "Klaipėdos Valstybinė Kolegija (KVK)",
        "country": "Lithuania",
        "city": "Klaipėda",
        "ranking": 7,
        "rating": 4.7,
        "badge": "Upcoming Opening: Dec 01, 2026",
        "category": "University of Applied Sciences",
        "description": "Third largest college in Lithuania, located in the coastal maritime hub of Klaipėda. Extremely affordable professional Bachelor degrees in Maritime Transport, IT, Nursing, and Tourism.",
        "tuition_range": "€2,500 - €3,500 / yr",
        "university_fee": "€2,700",
        "tuition_fee_currency": "EUR",
        "tuition_fee_min": 2500,
        "tuition_fee_max": 3500,
        "tuition_fee_eur": 2700,
        "tuition_fee_inr": 243000,
        "tuition_fee_enabled": True,
        "vfs_fee": "€120 (~₹10,800) + VFS ₹1,581",
        "living_cost_monthly": "€220 - €350 / mo",
        "programs": ["Informatics Engineering (Professional Bachelor)", "General Practice Nursing (BSc)", "International Business", "Maritime Transport Logistics"],
        "intakes": ["September 2027 (Starts Dec 01, 2026)", "September 2026"],
        "nawa_required": False,
        "is_active": True
    },
    {
        "name": "Kazimieras Simonavičius University (KSU)",
        "country": "Lithuania",
        "city": "Vilnius",
        "ranking": 8,
        "rating": 4.6,
        "badge": "Upcoming Opening: Dec 01, 2026",
        "category": "Innovative Private University",
        "description": "Modern boutique university in Vilnius specializing in Aviation Management, Fashion Industry, Business Management, and Law. Application fee €200. Hands-on European industry mentors.",
        "tuition_range": "€3,000 - €4,200 / yr",
        "university_fee": "€3,300",
        "tuition_fee_currency": "EUR",
        "tuition_fee_min": 3000,
        "tuition_fee_max": 4200,
        "tuition_fee_eur": 3300,
        "tuition_fee_inr": 297000,
        "tuition_fee_enabled": True,
        "vfs_fee": "€120 (~₹10,800) + VFS ₹1,581",
        "living_cost_monthly": "€280 - €450 / mo",
        "programs": ["Aviation Management (BSc)", "Business Management (BSc)", "Entertainment and Tourism Industries (BA)", "International Business Law (LLM)"],
        "intakes": ["September 2027 (Starts Dec 01, 2026)", "February 2027"],
        "nawa_required": False,
        "is_active": True
    },
    {
        "name": "Vilnius University (VU)",
        "country": "Lithuania",
        "city": "Vilnius",
        "ranking": 1,
        "rating": 5.0,
        "badge": "Upcoming Opening: Dec 01, 2026",
        "category": "National Flagship University",
        "description": "One of the oldest universities in Central and Eastern Europe (est. 1579). Consistently ranked among the top 400 universities in the world (QS). Rigorous academics, elite research, and EU recognition.",
        "tuition_range": "€3,500 - €6,000 / yr",
        "university_fee": "€3,800",
        "tuition_fee_currency": "EUR",
        "tuition_fee_min": 3500,
        "tuition_fee_max": 6000,
        "tuition_fee_eur": 3800,
        "tuition_fee_inr": 342000,
        "tuition_fee_enabled": True,
        "vfs_fee": "€120 (~₹10,800) + VFS ₹1,581",
        "living_cost_monthly": "€300 - €500 / mo",
        "programs": ["Software Engineering (BSc)", "Information Systems and Cyber Security (BSc)", "Management and Business Administration (BSc)", "Medicine (MD - 6 yrs)", "International Business Economics (MSc)"],
        "intakes": ["September 2027 (Starts Dec 01, 2026)", "September 2026"],
        "nawa_required": False,
        "is_active": True
    },
    {
        "name": "Kauno Kolegija Higher Education Institution (KAUKO)",
        "country": "Lithuania",
        "city": "Kaunas",
        "ranking": 5,
        "rating": 4.8,
        "badge": "Upcoming Opening: Dec 01, 2026",
        "category": "State Higher Education Institution",
        "description": "Top-ranked state applied sciences institution in Kaunas. Highly practical degrees with integrated 6-month industry internships. Low fees and high employment rates across the EU.",
        "tuition_range": "€2,600 - €3,600 / yr",
        "university_fee": "€2,800",
        "tuition_fee_currency": "EUR",
        "tuition_fee_min": 2600,
        "tuition_fee_max": 3600,
        "tuition_fee_eur": 2800,
        "tuition_fee_inr": 252000,
        "tuition_fee_enabled": True,
        "vfs_fee": "€120 (~₹10,800) + VFS ₹1,581",
        "living_cost_monthly": "€240 - €380 / mo",
        "programs": ["Software Engineering (Professional Bachelor)", "Tourism and Hotel Management", "Business Management", "General Practice Nursing", "Multimedia Technology"],
        "intakes": ["September 2027 (Starts Dec 01, 2026)", "September 2026"],
        "nawa_required": False,
        "is_active": True
    },

    # ── POLAND ── (From flyvizoverseas.com & Low-Fee Study Abroad for Indian Students)
    {
        "name": "Vistula University",
        "country": "Poland",
        "city": "Warsaw",
        "ranking": 1,
        "rating": 4.9,
        "badge": "Top Choice for Indian Students",
        "category": "International University",
        "description": "Warsaw's most international university. Accredited by CEEMAN and ACCA. Highly affordable tuition with double-degree programs with London South Bank University. NAWA qualification required.",
        "tuition_range": "8,000 - 14,000 PLN / yr (~€1,800 - €3,200)",
        "university_fee": "10,000 PLN (~€2,300)",
        "tuition_fee_currency": "PLN",
        "tuition_fee_min": 8000,
        "tuition_fee_max": 14000,
        "tuition_fee_pln": 10000,
        "tuition_fee_eur": 2300,
        "tuition_fee_inr": 210000,
        "tuition_fee_enabled": True,
        "vfs_fee": "€80 (~₹7,200) + VFS ₹1,800",
        "living_cost_monthly": "1,500 - 2,500 PLN / mo (~€350 - €580)",
        "programs": ["Computer Science (BSc / Inżynier)", "International Business (BA)", "Management & Marketing (BA/MA)", "Finance and Accounting (BSc)", "Data Science & Big Data (MSc)"],
        "intakes": ["October 2026", "February 2027", "October 2027"],
        "nawa_required": True,
        "is_active": True
    },
    {
        "name": "Warsaw University of Business (WSH / EUH)",
        "country": "Poland",
        "city": "Warsaw",
        "ranking": 2,
        "rating": 4.8,
        "badge": "Low Fee Leader",
        "category": "Business & Management College",
        "description": "Renowned for low tuition fees starting at 7,500 PLN/year. Extremely popular for Indian undergraduates seeking low-barrier entry to the Schengen zone and European job market.",
        "tuition_range": "7,500 - 12,000 PLN / yr (~€1,750 - €2,800)",
        "university_fee": "8,500 PLN (~€1,980)",
        "tuition_fee_currency": "PLN",
        "tuition_fee_min": 7500,
        "tuition_fee_max": 12000,
        "tuition_fee_pln": 8500,
        "tuition_fee_eur": 1980,
        "tuition_fee_inr": 178500,
        "tuition_fee_enabled": True,
        "vfs_fee": "€80 (~₹7,200) + VFS ₹1,800",
        "living_cost_monthly": "1,400 - 2,200 PLN / mo (~€320 - €500)",
        "programs": ["Management (BSc)", "Logistics & Supply Chain Management", "Internal Security & Cyber Defense", "International Relations (BA)", "Business Analytics (MSc)"],
        "intakes": ["October 2026", "February 2027", "October 2027"],
        "nawa_required": True,
        "is_active": True
    },
    {
        "name": "Vincent Pol University",
        "country": "Poland",
        "city": "Lublin",
        "ranking": 3,
        "rating": 4.8,
        "badge": "Affordable Healthcare & Tech",
        "category": "Applied Sciences University",
        "description": "Located in the student-friendly city of Lublin. Highly known for Physiotherapy, Nursing, Beauty Science, and Tourism & Hospitality. Exceptional dorm facilities at only 400 PLN/mo (~€90).",
        "tuition_range": "8,500 - 13,500 PLN / yr (~€1,950 - €3,100)",
        "university_fee": "9,500 PLN (~€2,200)",
        "tuition_fee_currency": "PLN",
        "tuition_fee_min": 8500,
        "tuition_fee_max": 13500,
        "tuition_fee_pln": 9500,
        "tuition_fee_eur": 2200,
        "tuition_fee_inr": 199500,
        "tuition_fee_enabled": True,
        "vfs_fee": "€80 (~₹7,200) + VFS ₹1,800",
        "living_cost_monthly": "1,200 - 1,800 PLN / mo (~€280 - €420)",
        "programs": ["Physiotherapy (5-Year Integrated Master)", "Nursing (BSc)", "Computer Science (BSc)", "International Tourism and Hospitality (BA)", "Beauty Science (Cosmetology BSc)"],
        "intakes": ["October 2026", "February 2027", "October 2027"],
        "nawa_required": True,
        "is_active": True
    },
    {
        "name": "University of Economics and Human Sciences in Warsaw (Vizja)",
        "country": "Poland",
        "city": "Warsaw",
        "ranking": 4,
        "rating": 4.9,
        "badge": "Modern Warsaw Campus",
        "category": "Private University",
        "description": "Ultra-modern campus in central Warsaw with world-class facilities. Programs in Computer Science, Psychology, Finance, and International Relations with strong career incubator.",
        "tuition_range": "9,000 - 15,000 PLN / yr (~€2,100 - €3,500)",
        "university_fee": "10,500 PLN (~€2,450)",
        "tuition_fee_currency": "PLN",
        "tuition_fee_min": 9000,
        "tuition_fee_max": 15000,
        "tuition_fee_pln": 10500,
        "tuition_fee_eur": 2450,
        "tuition_fee_inr": 220500,
        "tuition_fee_enabled": True,
        "vfs_fee": "€80 (~₹7,200) + VFS ₹1,800",
        "living_cost_monthly": "1,600 - 2,500 PLN / mo (~€370 - €580)",
        "programs": ["Computer Science (BSc)", "Cybersecurity (BSc)", "Finance and Accounting (BSc/MSc)", "Psychology (Master)", "Management (BSc/MSc)"],
        "intakes": ["October 2026", "February 2027", "October 2027"],
        "nawa_required": True,
        "is_active": True
    },
    {
        "name": "Collegium Civitas",
        "country": "Poland",
        "city": "Warsaw",
        "ranking": 5,
        "rating": 4.8,
        "badge": "Located at Palace of Culture",
        "category": "Social Sciences & Diplomacy",
        "description": "Prestigious academic institution situated inside Warsaw's iconic Palace of Culture and Science. Recognized for International Relations, Diplomacy, Media, and Security Studies.",
        "tuition_range": "9,500 - 16,000 PLN / yr (~€2,200 - €3,700)",
        "university_fee": "11,000 PLN (~€2,550)",
        "tuition_fee_currency": "PLN",
        "tuition_fee_min": 9500,
        "tuition_fee_max": 16000,
        "tuition_fee_pln": 11000,
        "tuition_fee_eur": 2550,
        "tuition_fee_inr": 231000,
        "tuition_fee_enabled": True,
        "vfs_fee": "€80 (~₹7,200) + VFS ₹1,800",
        "living_cost_monthly": "1,500 - 2,400 PLN / mo (~€350 - €560)",
        "programs": ["International Relations & Diplomacy (BA/MA)", "New Media & Journalism (BA)", "Sociology & Public Relations (BA)", "Criminal Justice & Security Studies (MA)"],
        "intakes": ["October 2026", "February 2027"],
        "nawa_required": True,
        "is_active": True
    },
    {
        "name": "WSB Merito University",
        "country": "Poland",
        "city": "Wroclaw / Warsaw / Poznan",
        "ranking": 6,
        "rating": 4.7,
        "badge": "Multi-Campus Network",
        "category": "Business & Applied IT",
        "description": "Poland's largest private university network with campuses in Warsaw, Wroclaw, Poznan, and Gdansk. Highly practical curriculum focused on IT engineering, logistics, and management.",
        "tuition_range": "8,000 - 13,000 PLN / yr (~€1,850 - €3,000)",
        "university_fee": "9,200 PLN (~€2,140)",
        "tuition_fee_currency": "PLN",
        "tuition_fee_min": 8000,
        "tuition_fee_max": 13000,
        "tuition_fee_pln": 9200,
        "tuition_fee_eur": 2140,
        "tuition_fee_inr": 193200,
        "tuition_fee_enabled": True,
        "vfs_fee": "€80 (~₹7,200) + VFS ₹1,800",
        "living_cost_monthly": "1,300 - 2,200 PLN / mo (~€300 - €510)",
        "programs": ["Computer Science & Programming (BSc)", "International Logistics (BSc)", "Business Administration (BA)", "Project Management (MSc)"],
        "intakes": ["October 2026", "February 2027", "October 2027"],
        "nawa_required": True,
        "is_active": True
    },
    {
        "name": "Lazarski University",
        "country": "Poland",
        "city": "Warsaw",
        "ranking": 7,
        "rating": 4.9,
        "badge": "Dual UK Degree Option",
        "category": "Law & Economics University",
        "description": "Top-ranked private university in Poland for Law and Economics. Offers validated double-degree diplomas with Coventry University (UK) at a fraction of British costs.",
        "tuition_range": "11,000 - 16,500 PLN / yr (~€2,550 - €3,800)",
        "university_fee": "12,500 PLN (~€2,900)",
        "tuition_fee_currency": "PLN",
        "tuition_fee_min": 11000,
        "tuition_fee_max": 16500,
        "tuition_fee_pln": 12500,
        "tuition_fee_eur": 2900,
        "tuition_fee_inr": 262500,
        "tuition_fee_enabled": True,
        "vfs_fee": "€80 (~₹7,200) + VFS ₹1,800",
        "living_cost_monthly": "1,600 - 2,500 PLN / mo (~€370 - €580)",
        "programs": ["Economics & International Business (BA)", "Management & Digital Marketing (BA)", "International Relations (BA/MA)", "Aviation Law and Management"],
        "intakes": ["October 2026", "February 2027"],
        "nawa_required": True,
        "is_active": True
    },
    {
        "name": "Wroclaw University of Science and Technology",
        "country": "Poland",
        "city": "Wroclaw",
        "ranking": 8,
        "rating": 4.9,
        "badge": "Elite Public Engineering",
        "category": "Public Technical University",
        "description": "One of Poland's top state engineering polytechnics. World-renowned in Mechanical, Civil, Chemical, and Computer Engineering. Highly respected across Germany and the EU.",
        "tuition_range": "10,000 - 16,000 PLN / yr (~€2,300 - €3,700)",
        "university_fee": "11,500 PLN (~€2,670)",
        "tuition_fee_currency": "PLN",
        "tuition_fee_min": 10000,
        "tuition_fee_max": 16000,
        "tuition_fee_pln": 11500,
        "tuition_fee_eur": 2670,
        "tuition_fee_inr": 241500,
        "tuition_fee_enabled": True,
        "vfs_fee": "€80 (~₹7,200) + VFS ₹1,800",
        "living_cost_monthly": "1,400 - 2,200 PLN / mo (~€320 - €510)",
        "programs": ["Applied Computer Science (BSc)", "Information Technology (BSc)", "Mechanical Engineering (BSc)", "Electronic and Computer Engineering (BSc)", "Advanced Informatics (MSc)"],
        "intakes": ["October 2026", "February 2027"],
        "nawa_required": True,
        "is_active": True
    },

    # ── UNITED KINGDOM ── (Affordable for Indian Students)
    {
        "name": "University of Bolton",
        "country": "United Kingdom",
        "city": "Bolton, Greater Manchester",
        "ranking": 1,
        "rating": 4.8,
        "badge": "Top 1 for Student Satisfaction",
        "category": "Public University",
        "description": "Ranked #1 in Greater Manchester for Student Satisfaction. Located 15 minutes from Manchester city center with some of the lowest tuition and accommodation costs in the UK.",
        "tuition_range": "£11,250 - £12,500 / yr (~₹11.8L - ₹13.1L)",
        "university_fee": "£11,800",
        "tuition_fee_currency": "GBP",
        "tuition_fee_min": 11250,
        "tuition_fee_max": 12500,
        "tuition_fee_inr": 1239000,
        "tuition_fee_enabled": True,
        "vfs_fee": "£490 (~₹51,450) + IHS £776/yr",
        "living_cost_monthly": "£600 - £800 / mo (~₹63,000 - ₹84,000)",
        "programs": ["BSc (Hons) Computing & Software Engineering", "BEng (Hons) Mechanical Engineering", "BSc (Hons) Biomedical Sciences", "MBA (Master of Business Administration)", "MSc Cloud & Network Security"],
        "intakes": ["September 2026", "January 2027", "September 2027"],
        "nawa_required": False,
        "is_active": True
    },
    {
        "name": "Teesside University",
        "country": "United Kingdom",
        "city": "Middlesbrough",
        "ranking": 2,
        "rating": 4.7,
        "badge": "Affordable North East Hub",
        "category": "Public Research University",
        "description": "Famous for Animation, Games Design, Artificial Intelligence, and Health Sciences. Low living costs in Middlesbrough make it extremely affordable for Indian families. Automatic merit scholarships available.",
        "tuition_range": "£12,000 - £13,500 / yr (~₹12.6L - ₹14.1L)",
        "university_fee": "£12,500",
        "tuition_fee_currency": "GBP",
        "tuition_fee_min": 12000,
        "tuition_fee_max": 13500,
        "tuition_fee_inr": 1312500,
        "tuition_fee_enabled": True,
        "vfs_fee": "£490 (~₹51,450) + IHS £776/yr",
        "living_cost_monthly": "£550 - £750 / mo",
        "programs": ["BSc (Hons) Computer Science", "BSc (Hons) Cybersecurity & Digital Forensics", "BSc (Hons) Nursing Studies", "MSc Data Science", "MSc International Management"],
        "intakes": ["September 2026", "January 2027", "September 2027"],
        "nawa_required": False,
        "is_active": True
    },
    {
        "name": "University of Cumbria",
        "country": "United Kingdom",
        "city": "Carlisle / Lancaster",
        "ranking": 3,
        "rating": 4.6,
        "badge": "Lake District Excellence",
        "category": "Public University",
        "description": "Historic institution located near the scenic Lake District. Known for Teacher Training, Nursing, Business, and Environmental Sciences. Generous international tuition fee waivers.",
        "tuition_range": "£12,000 - £13,000 / yr (~₹12.6L - ₹13.6L)",
        "university_fee": "£12,250",
        "tuition_fee_currency": "GBP",
        "tuition_fee_min": 12000,
        "tuition_fee_max": 13000,
        "tuition_fee_inr": 1286250,
        "tuition_fee_enabled": True,
        "vfs_fee": "£490 (~₹51,450) + IHS £776/yr",
        "living_cost_monthly": "£580 - £780 / mo",
        "programs": ["BSc (Hons) Business Management", "BSc (Hons) Adult Nursing", "BSc (Hons) Computer Science", "MBA Leadership and Sustainability", "MSc Project Management"],
        "intakes": ["September 2026", "January 2027"],
        "nawa_required": False,
        "is_active": True
    },
    {
        "name": "Leeds Beckett University",
        "country": "United Kingdom",
        "city": "Leeds, West Yorkshire",
        "ranking": 4,
        "rating": 4.8,
        "badge": "Vibrant Student City",
        "category": "Large Public University",
        "description": "Over 24,000 students in one of the UK's fastest growing financial and legal hubs outside London. Extensive placement years with multinational firms and competitive international fees.",
        "tuition_range": "£12,500 - £14,000 / yr (~₹13.1L - ₹14.7L)",
        "university_fee": "£13,000",
        "tuition_fee_currency": "GBP",
        "tuition_fee_min": 12500,
        "tuition_fee_max": 14000,
        "tuition_fee_inr": 1365000,
        "tuition_fee_enabled": True,
        "vfs_fee": "£490 (~₹51,450) + IHS £776/yr",
        "living_cost_monthly": "£650 - £850 / mo",
        "programs": ["BSc (Hons) Computing", "BSc (Hons) Business Information Technology", "BA (Hons) Business and Management", "MSc Information and Technology", "MSc Finance"],
        "intakes": ["September 2026", "January 2027", "September 2027"],
        "nawa_required": False,
        "is_active": True
    },
    {
        "name": "University of Chester",
        "country": "United Kingdom",
        "city": "Chester, Cheshire",
        "ranking": 5,
        "rating": 4.7,
        "badge": "Safe Historic City",
        "category": "Public University",
        "description": "One of the oldest higher education institutions in England (est. 1839). Highly rated for graduate employability and student support. Strong faculty-to-student ratio and low rent.",
        "tuition_range": "£12,750 - £13,500 / yr (~₹13.3L - ₹14.1L)",
        "university_fee": "£12,950",
        "tuition_fee_currency": "GBP",
        "tuition_fee_min": 12750,
        "tuition_fee_max": 13500,
        "tuition_fee_inr": 1359750,
        "tuition_fee_enabled": True,
        "vfs_fee": "£490 (~₹51,450) + IHS £776/yr",
        "living_cost_monthly": "£600 - £800 / mo",
        "programs": ["BSc (Hons) Software Engineering", "BSc (Hons) Cybersecurity", "BSc (Hons) International Business", "MSc Health and Social Care", "MBA Master of Business Administration"],
        "intakes": ["September 2026", "January 2027"],
        "nawa_required": False,
        "is_active": True
    },
    {
        "name": "Wrexham University",
        "country": "United Kingdom",
        "city": "Wrexham, North Wales",
        "ranking": 6,
        "rating": 4.7,
        "badge": "Ultra Low Cost in UK",
        "category": "Public University",
        "description": "Formerly Glyndwr University. Offers some of the lowest tuition and living expenses in the entire British Isles. 2-year post-study work visa eligible with friendly community.",
        "tuition_range": "£11,750 - £12,500 / yr (~₹12.3L - ₹13.1L)",
        "university_fee": "£11,950",
        "tuition_fee_currency": "GBP",
        "tuition_fee_min": 11750,
        "tuition_fee_max": 12500,
        "tuition_fee_inr": 1254750,
        "tuition_fee_enabled": True,
        "vfs_fee": "£490 (~₹51,450) + IHS £776/yr",
        "living_cost_monthly": "£500 - £700 / mo",
        "programs": ["BSc (Hons) Cyber Security", "BSc (Hons) Computer Game Development", "BEng (Hons) Aeronautical Engineering", "MSc Computer Science", "MSc Engineering (Mechatronics)"],
        "intakes": ["September 2026", "January 2027", "September 2027"],
        "nawa_required": False,
        "is_active": True
    },
    {
        "name": "University of Bedfordshire",
        "country": "United Kingdom",
        "city": "Luton / Bedford",
        "ranking": 7,
        "rating": 4.6,
        "badge": "30 Mins from Central London",
        "category": "Public University",
        "description": "Just 30 minutes by train from London St Pancras with significantly lower cost of living than London. Highly multicultural campus with dedicated Indian student society.",
        "tuition_range": "£12,500 - £13,500 / yr (~₹13.1L - ₹14.1L)",
        "university_fee": "£12,850",
        "tuition_fee_currency": "GBP",
        "tuition_fee_min": 12500,
        "tuition_fee_max": 13500,
        "tuition_fee_inr": 1349250,
        "tuition_fee_enabled": True,
        "vfs_fee": "£490 (~₹51,450) + IHS £776/yr",
        "living_cost_monthly": "£650 - £850 / mo",
        "programs": ["BSc (Hons) Artificial Intelligence and Robotics", "BSc (Hons) Computer Science", "BSc (Hons) Accounting and Finance", "MSc Applied Computing and IT", "MSc Public Health"],
        "intakes": ["September 2026", "January 2027", "September 2027"],
        "nawa_required": False,
        "is_active": True
    },

    # ── ALBANIA ──
    {
        "name": "Canadian Institute of Technology (CIT)",
        "country": "Albania",
        "city": "Tirana",
        "ranking": 1,
        "rating": 4.8,
        "badge": "Double Degree with UNINT Italy",
        "category": "English-Medium Tech Institute",
        "description": "Pioneering English-medium higher education institute in Tirana. Offers North American & European curriculum in Software Engineering, AI & Data Science. Double degree options with UNINT University of Rome, Italy.",
        "tuition_range": "€1,800 - €3,500 / yr (~₹1.6L - ₹3.15L)",
        "university_fee": "€2,200",
        "tuition_fee_currency": "EUR",
        "tuition_fee_min": 1800,
        "tuition_fee_max": 3500,
        "tuition_fee_eur": 2200,
        "tuition_fee_inr": 198000,
        "tuition_fee_enabled": True,
        "vfs_fee": "€50 (~₹4,500) E-Visa",
        "living_cost_monthly": "€200 - €320 / mo (~₹18,000 - ₹28,800)",
        "programs": ["Software Engineering (BSc)", "Artificial Intelligence & Data Science (BSc)", "Computer Engineering & IT (BSc)", "Business Administration & Management (BSc)", "Double Master in International Management (UNINT Italy)"],
        "intakes": ["October 2026", "February 2027", "October 2027"],
        "nawa_required": False,
        "is_active": True
    },
    {
        "name": "Mediterranean University of Albania",
        "country": "Albania",
        "city": "Tirana",
        "ranking": 2,
        "rating": 4.7,
        "badge": "Low Fee Leader in Europe",
        "category": "Private University",
        "description": "Accredited European university offering English and Italian study programs. Highly popular for Nursing, Physiotherapy, Banking & Finance, and Law at an exceptionally low tuition fee.",
        "tuition_range": "€1,500 - €2,800 / yr (~₹1.35L - ₹2.5L)",
        "university_fee": "€1,800",
        "tuition_fee_currency": "EUR",
        "tuition_fee_min": 1500,
        "tuition_fee_max": 2800,
        "tuition_fee_eur": 1800,
        "tuition_fee_inr": 162000,
        "tuition_fee_enabled": True,
        "vfs_fee": "€50 (~₹4,500) E-Visa",
        "living_cost_monthly": "€180 - €300 / mo",
        "programs": ["Nursing & Healthcare (BSc)", "Physiotherapy (BSc)", "Banking and Financial Management (BSc)", "Law & International Relations (LLB)", "Information Technology (BSc)"],
        "intakes": ["October 2026", "February 2027"],
        "nawa_required": False,
        "is_active": True
    },

    # ── MOLDOVA ──
    {
        "name": "Nicolae Testemițanu State University of Medicine and Pharmacy (USMF)",
        "country": "Moldova",
        "city": "Chisinau",
        "ranking": 1,
        "rating": 4.9,
        "badge": "WHO & NMC Recognized Medical",
        "category": "National Medical University",
        "description": "Moldova's premier public medical institution (est. 1945). Recognized by WHO, USMLE, GMC, and NMC India. High-quality 6-year General Medicine and 5-year Dentistry in 100% English medium.",
        "tuition_range": "$6,000 - $6,500 / yr (~₹5.0L - ₹5.4L)",
        "university_fee": "$6,500",
        "tuition_fee_currency": "USD",
        "tuition_fee_min": 6000,
        "tuition_fee_max": 6500,
        "tuition_fee_usd": 6500,
        "tuition_fee_inr": 546000,
        "tuition_fee_enabled": True,
        "vfs_fee": "€80 (~₹7,200)",
        "living_cost_monthly": "€180 - €280 / mo",
        "programs": ["General Medicine (MD - 6 Years)", "Dentistry / Stomatology (BDS - 5 Years)", "Pharmacy (BPharm / MPharm)", "Physiotherapy & Medical Rehabilitation"],
        "intakes": ["September 2026", "October 2026", "September 2027"],
        "nawa_required": False,
        "is_active": True
    },
    {
        "name": "Moldova State University (USM)",
        "country": "Moldova",
        "city": "Chisinau",
        "ranking": 2,
        "rating": 4.8,
        "badge": "Affordable European Higher Ed",
        "category": "Public Classical University",
        "description": "Moldova's highest-ranking comprehensive university. Offers European Bologna-compliant Bachelor and Master degrees in IT, Software Engineering, International Business, and Finance.",
        "tuition_range": "€2,000 - €2,800 / yr (~₹1.8L - ₹2.5L)",
        "university_fee": "€2,200",
        "tuition_fee_currency": "EUR",
        "tuition_fee_min": 2000,
        "tuition_fee_max": 2800,
        "tuition_fee_eur": 2200,
        "tuition_fee_inr": 198000,
        "tuition_fee_enabled": True,
        "vfs_fee": "€80 (~₹7,200)",
        "living_cost_monthly": "€180 - €300 / mo",
        "programs": ["Computer Science & Software Development (BSc)", "Information Technology & Communication (BSc)", "Business & Administration (BA)", "Finance & Banking (BSc)", "International Relations (BA)"],
        "intakes": ["September 2026", "February 2027", "September 2027"],
        "nawa_required": False,
        "is_active": True
    },
    {
        "name": "Technical University of Moldova (UTM)",
        "country": "Moldova",
        "city": "Chisinau",
        "ranking": 3,
        "rating": 4.8,
        "badge": "Engineering & IT Powerhouse",
        "category": "Public Technical University",
        "description": "The only higher technical educational institution in Moldova. Renowned for Software Engineering, Robotics, Mechatronics, and Civil Engineering with modern labs.",
        "tuition_range": "€2,200 - €3,000 / yr (~₹1.98L - ₹2.7L)",
        "university_fee": "€2,500",
        "tuition_fee_currency": "EUR",
        "tuition_fee_min": 2200,
        "tuition_fee_max": 3000,
        "tuition_fee_eur": 2500,
        "tuition_fee_inr": 225000,
        "tuition_fee_enabled": True,
        "vfs_fee": "€80 (~₹7,200)",
        "living_cost_monthly": "€180 - €300 / mo",
        "programs": ["Software Engineering (BSc)", "Robotics and Automation (BSc)", "Information Systems (BSc)", "Civil and Industrial Engineering", "Food Technology (BSc)"],
        "intakes": ["September 2026", "September 2027"],
        "nawa_required": False,
        "is_active": True
    },

    # ── BULGARIA ──
    {
        "name": "Medical University of Sofia",
        "country": "Bulgaria",
        "city": "Sofia",
        "ranking": 1,
        "rating": 4.9,
        "badge": "Schengen EU Medical Degree",
        "category": "Premier Medical University",
        "description": "The oldest and most prestigious medical school in Bulgaria. Fully EU recognized medical qualifications allowing direct practice across the Schengen area, UK, and worldwide.",
        "tuition_range": "€7,500 - €8,000 / yr (~₹6.75L - ₹7.2L)",
        "university_fee": "€8,000",
        "tuition_fee_currency": "EUR",
        "tuition_fee_min": 7500,
        "tuition_fee_max": 8000,
        "tuition_fee_eur": 8000,
        "tuition_fee_inr": 720000,
        "tuition_fee_enabled": True,
        "vfs_fee": "€100 (~₹9,000)",
        "living_cost_monthly": "€300 - €450 / mo",
        "programs": ["Medicine (MD - 6 Years in English)", "Dental Medicine (DMD - 5.5 Years in English)", "Pharmacy (MPharm - 5 Years)", "Public Health & Healthcare Management"],
        "intakes": ["October 2026", "October 2027"],
        "nawa_required": False,
        "is_active": True
    },
    {
        "name": "Technical University of Sofia",
        "country": "Bulgaria",
        "city": "Sofia",
        "ranking": 2,
        "rating": 4.7,
        "badge": "Low Fee Tech in EU",
        "category": "State Technical University",
        "description": "Largest technical university in Bulgaria. Strong English-taught programs in Computer Engineering, Telecom, and Industrial Management at accessible European fees.",
        "tuition_range": "€3,000 - €4,000 / yr (~₹2.7L - ₹3.6L)",
        "university_fee": "€3,500",
        "tuition_fee_currency": "EUR",
        "tuition_fee_min": 3000,
        "tuition_fee_max": 4000,
        "tuition_fee_eur": 3500,
        "tuition_fee_inr": 315000,
        "tuition_fee_enabled": True,
        "vfs_fee": "€100 (~₹9,000)",
        "living_cost_monthly": "€250 - €400 / mo",
        "programs": ["Computer Systems and Technologies (BSc)", "Telecommunications (BSc)", "Industrial Engineering (BSc)", "Information Technology (MSc)"],
        "intakes": ["October 2026", "October 2027"],
        "nawa_required": False,
        "is_active": True
    },

    # ── LATVIA ──
    {
        "name": "Riga Technical University (RTU)",
        "country": "Latvia",
        "city": "Riga",
        "ranking": 1,
        "rating": 4.9,
        "badge": "Top Technical in Baltics",
        "category": "State Technical University",
        "description": "Ranked among top universities in Eastern Europe. Renowned for Computer Systems, Telecommunications, Aviation Transport, and Business Informatics in English.",
        "tuition_range": "€3,500 - €4,500 / yr (~₹3.15L - ₹4.05L)",
        "university_fee": "€3,800",
        "tuition_fee_currency": "EUR",
        "tuition_fee_min": 3500,
        "tuition_fee_max": 4500,
        "tuition_fee_eur": 3800,
        "tuition_fee_inr": 342000,
        "tuition_fee_enabled": True,
        "vfs_fee": "€80 (~₹7,200)",
        "living_cost_monthly": "€280 - €450 / mo",
        "programs": ["Computer Systems (BSc/MSc)", "Aviation Transport (BSc)", "Telecommunications (BSc)", "Business Informatics (BSc)", "Entrepreneurship & Management (BSc)"],
        "intakes": ["September 2026", "February 2027", "September 2027"],
        "nawa_required": False,
        "is_active": True
    },
    {
        "name": "Turiba University",
        "country": "Latvia",
        "city": "Riga",
        "ranking": 2,
        "rating": 4.8,
        "badge": "Practical Business & Tourism",
        "category": "University of Applied Sciences",
        "description": "Largest private business school in Latvia. Accredited by UNWTO for Tourism. Practical degree pathways with extensive Schengen internship connections.",
        "tuition_range": "€3,200 - €4,000 / yr (~₹2.88L - ₹3.6L)",
        "university_fee": "€3,400",
        "tuition_fee_currency": "EUR",
        "tuition_fee_min": 3200,
        "tuition_fee_max": 4000,
        "tuition_fee_eur": 3400,
        "tuition_fee_inr": 306000,
        "tuition_fee_enabled": True,
        "vfs_fee": "€80 (~₹7,200)",
        "living_cost_monthly": "€260 - €420 / mo",
        "programs": ["Business Administration (BA)", "Tourism and Hospitality Management (BA)", "Computer Systems (BSc)", "International Finance (BA)", "Cybersecurity & Data Protection (MSc)"],
        "intakes": ["September 2026", "February 2027", "September 2027"],
        "nawa_required": False,
        "is_active": True
    },

    # ── HUNGARY ──
    {
        "name": "IBS International Business School Budapest",
        "country": "Hungary",
        "city": "Budapest",
        "ranking": 1,
        "rating": 4.9,
        "badge": "British Degree from Univ of Buckingham",
        "category": "Private Business School",
        "description": "Delivers full degrees from the University of Buckingham (UK) in Budapest. Tuition is €4,000/sem for Bachelors, €6,400/sem for Masters. EU Schengen visa plus British degree prestige.",
        "tuition_range": "€4,000 - €8,000 / yr (~₹3.6L - ₹7.2L)",
        "university_fee": "€6,500",
        "tuition_fee_currency": "EUR",
        "tuition_fee_min": 4000,
        "tuition_fee_max": 8000,
        "tuition_fee_eur": 6500,
        "tuition_fee_inr": 585000,
        "tuition_fee_enabled": True,
        "vfs_fee": "€110 (~₹9,900)",
        "living_cost_monthly": "€350 - €550 / mo",
        "programs": ["BSc in Corporate Finance", "BSc in Business Management with AI", "BSc in Marketing", "MSc in Strategic International Management", "MSc in Financial Management"],
        "intakes": ["September 2026", "February 2027", "September 2027"],
        "nawa_required": False,
        "is_active": True
    },
    {
        "name": "University of Debrecen",
        "country": "Hungary",
        "city": "Debrecen",
        "ranking": 2,
        "rating": 4.9,
        "badge": "Comprehensive State University",
        "category": "Historic Public University",
        "description": "One of Hungary's premier universities with over 28,000 students. Affordable engineering, business, and computer science degrees taught fully in English.",
        "tuition_range": "€4,500 - €7,000 / yr (~₹4.05L - ₹6.3L)",
        "university_fee": "€5,500",
        "tuition_fee_currency": "EUR",
        "tuition_fee_min": 4500,
        "tuition_fee_max": 7000,
        "tuition_fee_eur": 5500,
        "tuition_fee_inr": 495000,
        "tuition_fee_enabled": True,
        "vfs_fee": "€110 (~₹9,900)",
        "living_cost_monthly": "€280 - €450 / mo",
        "programs": ["Computer Science (BSc)", "Mechanical Engineering (BSc)", "Business Administration & Management (BSc)", "Biotechnology (BSc)", "Software Engineering (MSc)"],
        "intakes": ["September 2026", "February 2027"],
        "nawa_required": False,
        "is_active": True
    },

    # ── MONTENEGRO ──
    {
        "name": "University of Montenegro",
        "country": "Montenegro",
        "city": "Podgorica",
        "ranking": 1,
        "rating": 4.7,
        "badge": "Flat Rate €3,500 / Year",
        "category": "National Public University",
        "description": "Montenegro's premier public institution. Flat rate tuition of €3,500/year. Direct E-visa process, low cost of living, and scenic Adriatic environment.",
        "tuition_range": "€3,000 - €3,500 / yr (~₹2.7L - ₹3.15L)",
        "university_fee": "€3,500",
        "tuition_fee_currency": "EUR",
        "tuition_fee_min": 3000,
        "tuition_fee_max": 3500,
        "tuition_fee_eur": 3500,
        "tuition_fee_inr": 315000,
        "tuition_fee_enabled": True,
        "vfs_fee": "€35 (~₹3,150) E-Visa",
        "living_cost_monthly": "€220 - €350 / mo",
        "programs": ["Computer Science and Information Systems (BSc)", "Economics and International Business (BA)", "Maritime Studies (BSc)", "Civil Engineering"],
        "intakes": ["October 2026", "October 2027"],
        "nawa_required": False,
        "is_active": True
    },

    # ── GEORGIA ──
    {
        "name": "University of Georgia (UG)",
        "country": "Georgia",
        "city": "Tbilisi",
        "ranking": 1,
        "rating": 4.9,
        "badge": "Leading Private University",
        "category": "Private University",
        "description": "Largest private university in Georgia. High popularity for Medicine, IT, and Business Administration among Indian students. Modern campus with high clinical exposure.",
        "tuition_range": "$3,500 - $5,500 / yr (~₹2.95L - ₹4.6L)",
        "university_fee": "$4,000",
        "tuition_fee_currency": "USD",
        "tuition_fee_min": 3500,
        "tuition_fee_max": 5500,
        "tuition_fee_usd": 4000,
        "tuition_fee_inr": 336000,
        "tuition_fee_enabled": True,
        "vfs_fee": "$50 (~₹4,200)",
        "living_cost_monthly": "$200 - $350 / mo (~₹17,000 - ₹29,000)",
        "programs": ["General Medicine (MD - 6 Years)", "Dentistry (BDS - 5 Years)", "Information Technology (BSc)", "Business Administration (BBA/MBA)"],
        "intakes": ["September 2026", "March 2027", "September 2027"],
        "nawa_required": False,
        "is_active": True
    },

    # ── MALTA ──
    {
        "name": "American University of Malta",
        "country": "Malta",
        "city": "Cospicua",
        "ranking": 1,
        "rating": 4.7,
        "badge": "English Speaking Schengen Island",
        "category": "American-Accredited University",
        "description": "100% English-speaking European island. American curriculum and Schengen residence permit allowing seamless European travel and post-study opportunities.",
        "tuition_range": "€5,000 - €7,000 / yr (~₹4.5L - ₹6.3L)",
        "university_fee": "€5,500",
        "tuition_fee_currency": "EUR",
        "tuition_fee_min": 5000,
        "tuition_fee_max": 7000,
        "tuition_fee_eur": 5500,
        "tuition_fee_inr": 495000,
        "tuition_fee_enabled": True,
        "vfs_fee": "€100 (~₹9,000)",
        "living_cost_monthly": "€450 - €650 / mo",
        "programs": ["Game Development & Animation (BSc)", "Software Engineering (BSc)", "Business Administration (BS)", "Accounting and Finance (BS)", "MBA (Master of Business Administration)"],
        "intakes": ["October 2026", "February 2027", "October 2027"],
        "nawa_required": False,
        "is_active": True
    },

    # ── MAURITIUS ──
    {
        "name": "Amity Institute of Higher Education Mauritius",
        "country": "Mauritius",
        "city": "Cybercity, Ebene",
        "ranking": 1,
        "rating": 4.8,
        "badge": "No Visa Fee / Low Indian Costs",
        "category": "Private Higher Education Institute",
        "description": "Located in the Ebene Cybercity business district. Very low tuition fees ($3,500/yr), fast student visa approval, no separate visa fee, and strong cultural comfort for Indian students.",
        "tuition_range": "$3,200 - $4,200 / yr (~₹2.7L - ₹3.5L)",
        "university_fee": "$3,500",
        "tuition_fee_currency": "USD",
        "tuition_fee_min": 3200,
        "tuition_fee_max": 4200,
        "tuition_fee_usd": 3500,
        "tuition_fee_inr": 294000,
        "tuition_fee_enabled": True,
        "vfs_fee": "Free / $50 student permit",
        "living_cost_monthly": "$220 - $350 / mo (~₹18,000 - ₹29,000)",
        "programs": ["BSc (Hons) Information Technology", "BBA (Bachelor of Business Administration)", "BSc (Hons) Tourism & Hospitality", "MBA (International Business)", "MSc Cyber Security"],
        "intakes": ["October 2026", "February 2027", "July 2027"],
        "nawa_required": False,
        "is_active": True
    },

    # ── MALAYSIA ──
    {
        "name": "Asia Pacific University (APU)",
        "country": "Malaysia",
        "city": "Kuala Lumpur",
        "ranking": 1,
        "rating": 4.9,
        "badge": "Premier Digital Tech Institute",
        "category": "Premier Technology University",
        "description": "Ranked #1 for International Students in Malaysia. Premier Digital Tech Institution status with 100% employability track record. Dual awards with De Montfort University (UK).",
        "tuition_range": "$3,500 - $4,800 / yr (~₹2.9L - ₹4.0L)",
        "university_fee": "$4,200",
        "tuition_fee_currency": "USD",
        "tuition_fee_min": 3500,
        "tuition_fee_max": 4800,
        "tuition_fee_usd": 4200,
        "tuition_fee_inr": 352800,
        "tuition_fee_enabled": True,
        "vfs_fee": "2,000 MYR (~₹38,000 EMGS)",
        "living_cost_monthly": "$250 - $400 / mo (~₹21,000 - ₹33,600)",
        "programs": ["BSc (Hons) Computer Science with AI", "BSc (Hons) Software Engineering", "BSc (Hons) Cybersecurity", "BA (Hons) International Business", "MSc Data Science and Business Analytics"],
        "intakes": ["October 2026", "February 2027", "May 2027", "October 2027"],
        "nawa_required": False,
        "is_active": True
    },

    # ── GERMANY ──
    {
        "name": "IU International University of Applied Sciences",
        "country": "Germany",
        "city": "Berlin / Bad Honnef",
        "ranking": 1,
        "rating": 4.8,
        "badge": "Accredited German State Degree",
        "category": "Applied Sciences University",
        "description": "Germany's largest accredited university. English-taught Bachelor and Master degrees with flexible study models and 18-month German post-study work visa eligibility.",
        "tuition_range": "€7,500 - €10,500 / yr (~₹6.75L - ₹9.45L)",
        "university_fee": "€8,200",
        "tuition_fee_currency": "EUR",
        "tuition_fee_min": 7500,
        "tuition_fee_max": 10500,
        "tuition_fee_eur": 8200,
        "tuition_fee_inr": 738000,
        "tuition_fee_enabled": True,
        "vfs_fee": "€75 (~₹6,750) + Blocked Account €11,904",
        "living_cost_monthly": "€600 - €900 / mo",
        "programs": ["BSc Computer Science", "BSc Applied Artificial Intelligence", "BSc Cyber Security", "BA International Management", "MSc Data Management"],
        "intakes": ["October 2026", "January 2027", "April 2027", "October 2027"],
        "nawa_required": False,
        "is_active": True
    },

    # ── FINLAND ──
    {
        "name": "Centria University of Applied Sciences",
        "country": "Finland",
        "city": "Kokkola",
        "ranking": 1,
        "rating": 4.8,
        "badge": "Early Bird Scholarship Available",
        "category": "University of Applied Sciences",
        "description": "Ranked among the best UAS in Finland for international student support. Early-bird tuition scholarships reduce fees significantly for Indian students. High quality of life and green technology focus.",
        "tuition_range": "€6,500 - €8,500 / yr (~₹5.85L - ₹7.65L)",
        "university_fee": "€7,000",
        "tuition_fee_currency": "EUR",
        "tuition_fee_min": 6500,
        "tuition_fee_max": 8500,
        "tuition_fee_eur": 7000,
        "tuition_fee_inr": 630000,
        "tuition_fee_enabled": True,
        "vfs_fee": "€350 (~₹31,500) Migri Permit",
        "living_cost_monthly": "€500 - €750 / mo",
        "programs": ["Information Technology (BEng)", "Business Management (BBA)", "Industrial Management (BEng)", "Environmental Chemistry and Technology (BEng)"],
        "intakes": ["August 2026", "January 2027", "August 2027"],
        "nawa_required": False,
        "is_active": True
    },

    # ── FRANCE ──
    {
        "name": "Paris School of Business (PSB)",
        "country": "France",
        "city": "Paris",
        "ranking": 1,
        "rating": 4.8,
        "badge": "AACSB & AMBA Accredited",
        "category": "Grandes Écoles Elite Business",
        "description": "Prestigious business school in central Paris. 100% English taught programs in Luxury Management, International Business, and Data Management with generous Indian student scholarships.",
        "tuition_range": "€7,500 - €9,500 / yr (~₹6.75L - ₹8.55L)",
        "university_fee": "€8,500",
        "tuition_fee_currency": "EUR",
        "tuition_fee_min": 7500,
        "tuition_fee_max": 9500,
        "tuition_fee_eur": 8500,
        "tuition_fee_inr": 765000,
        "tuition_fee_enabled": True,
        "vfs_fee": "€50 (~₹4,500) + Campus France ₹18,000",
        "living_cost_monthly": "€650 - €950 / mo",
        "programs": ["BBA International Business", "MSc Luxury Brand Management", "MSc Data Analytics & AI for Business", "MSc International Finance", "MBA (General Management)"],
        "intakes": ["September 2026", "February 2027", "September 2027"],
        "nawa_required": False,
        "is_active": True
    },

    # ── IRELAND ──
    {
        "name": "National College of Ireland (NCI)",
        "country": "Ireland",
        "city": "Dublin IFSC",
        "ranking": 1,
        "rating": 4.9,
        "badge": "Heart of European Silicon Docks",
        "category": "Public Autonomous College",
        "description": "Located directly inside Dublin's International Financial Services Centre (IFSC) next to Google, Meta, and Microsoft EU HQs. 2-year post-study work visa (Stamp 1G) with exceptional tech employment rates.",
        "tuition_range": "€10,500 - €13,000 / yr (~₹9.45L - ₹11.7L)",
        "university_fee": "€11,500",
        "tuition_fee_currency": "EUR",
        "tuition_fee_min": 10500,
        "tuition_fee_max": 13000,
        "tuition_fee_eur": 11500,
        "tuition_fee_inr": 1035000,
        "tuition_fee_enabled": True,
        "vfs_fee": "€100 (~₹9,000)",
        "living_cost_monthly": "€700 - €1,000 / mo",
        "programs": ["BSc (Hons) in Computing", "BSc (Hons) in Data Science", "BA (Hons) in Business", "MSc in Cybersecurity", "MSc in Cloud Computing", "MSc in FinTech"],
        "intakes": ["September 2026", "January 2027", "September 2027"],
        "nawa_required": False,
        "is_active": True
    },

    # ── SWEDEN ──
    {
        "name": "Halmstad University",
        "country": "Sweden",
        "city": "Halmstad",
        "ranking": 1,
        "rating": 4.8,
        "badge": "Innovation & AI Research Hub",
        "category": "State University",
        "description": "Renowned for AI, Intelligent Systems, and Innovation Sciences. Taught in English with strong corporate ties to Volvo, IKEA, and Swedish tech unicorns.",
        "tuition_range": "85,000 - 120,000 SEK / yr (~€7,500 - €10,500)",
        "university_fee": "95,000 SEK (~€8,350)",
        "tuition_fee_currency": "SEK",
        "tuition_fee_min": 85000,
        "tuition_fee_max": 120000,
        "tuition_fee_eur": 8350,
        "tuition_fee_inr": 760000,
        "tuition_fee_enabled": True,
        "vfs_fee": "1,500 SEK (~₹12,000)",
        "living_cost_monthly": "8,500 - 10,500 SEK / mo (~€750 - €920)",
        "programs": ["Applied Artificial Intelligence (MSc)", "Information Technology (MSc)", "Embedded and Intelligent Systems (MSc)", "Mechanical Engineering (BSc)", "International Marketing (BSc)"],
        "intakes": ["August 2026", "January 2027", "August 2027"],
        "nawa_required": False,
        "is_active": True
    },

    # ── AUSTRALIA (Affordable Tier) ──
    {
        "name": "Torrens University Australia",
        "country": "Australia",
        "city": "Sydney / Melbourne / Adelaide / Brisbane",
        "ranking": 1,
        "rating": 4.8,
        "badge": "Fast-Track Affordable Degree",
        "category": "Accredited National University",
        "description": "Fast-growing Australian university with campuses in Sydney, Melbourne, Adelaide, and Brisbane. Offers flexible trimestral intakes and competitive tuition fees for Indian undergraduates and postgraduates.",
        "tuition_range": "AUD 16,000 - 22,000 / yr (~₹8.8L - ₹12.1L)",
        "university_fee": "AUD 18,500",
        "tuition_fee_currency": "AUD",
        "tuition_fee_min": 16000,
        "tuition_fee_max": 22000,
        "tuition_fee_inr": 1017500,
        "tuition_fee_enabled": True,
        "vfs_fee": "AUD 1,600 (~₹88,000 Subclass 500)",
        "living_cost_monthly": "AUD 1,400 - 1,800 / mo (~₹77,000 - ₹99,000)",
        "programs": ["Bachelor of Information Technology", "Bachelor of Business (Information Systems)", "Bachelor of Nursing", "Master of Business Information Systems (MBIS)", "Master of Global Project Management"],
        "intakes": ["September 2026", "February 2027", "June 2027"],
        "nawa_required": False,
        "is_active": True
    },
    {
        "name": "Southern Cross University",
        "country": "Australia",
        "city": "Gold Coast / Coffs Harbour",
        "ranking": 2,
        "rating": 4.7,
        "badge": "Regional Visa Bonus Points",
        "category": "Public Research University",
        "description": "Regional campus locations provide extra post-study work visa extensions (up to 4-5 years) and migration points. Strong courses in Information Technology, Health, and Business.",
        "tuition_range": "AUD 18,000 - 24,000 / yr (~₹9.9L - ₹13.2L)",
        "university_fee": "AUD 20,000",
        "tuition_fee_currency": "AUD",
        "tuition_fee_min": 18000,
        "tuition_fee_max": 24000,
        "tuition_fee_inr": 1100000,
        "tuition_fee_enabled": True,
        "vfs_fee": "AUD 1,600 (~₹88,000 Subclass 500)",
        "living_cost_monthly": "AUD 1,300 - 1,700 / mo",
        "programs": ["Bachelor of Information Technology", "Bachelor of Nursing", "Bachelor of Business and Enterprise", "Master of Information Technology", "Master of Engineering Management"],
        "intakes": ["October 2026", "March 2027", "July 2027"],
        "nawa_required": False,
        "is_active": True
    },

    # ── NEW ZEALAND ──
    {
        "name": "NZSE (New Zealand Skills and Education College)",
        "country": "New Zealand",
        "city": "Auckland",
        "ranking": 1,
        "rating": 4.8,
        "badge": "Affordable IT & Healthcare",
        "category": "NZQA Category 1 Institute",
        "description": "Category 1 NZQA tertiary institute located in central Auckland. Very low tuition fees starting at NZD 17,650/yr. Seamless pathway to NZ post-study work visa and employment.",
        "tuition_range": "NZD 17,650 - 19,500 / yr (~₹8.8L - ₹9.75L)",
        "university_fee": "NZD 18,500",
        "tuition_fee_currency": "NZD",
        "tuition_fee_min": 17650,
        "tuition_fee_max": 19500,
        "tuition_fee_inr": 925000,
        "tuition_fee_enabled": True,
        "vfs_fee": "NZD 375 (~₹19,000)",
        "living_cost_monthly": "NZD 1,200 - 1,600 / mo (~₹60,000 - ₹80,000)",
        "programs": ["Diploma in Software Development (Level 7)", "Diploma in Cloud Computing (Level 7)", "Diploma in Healthcare Management (Level 7)", "Diploma in Applied Business (Level 7)"],
        "intakes": ["September 2026", "November 2026", "February 2027", "July 2027"],
        "nawa_required": False,
        "is_active": True
    },
    {
        "name": "ARA Institute of Canterbury",
        "country": "New Zealand",
        "city": "Christchurch",
        "ranking": 2,
        "rating": 4.9,
        "badge": "Te Pūkenga Institute of Technology",
        "category": "Government Institute of Technology",
        "description": "Largest government institute of technology in New Zealand's South Island. Practical hands-on training in Engineering, ICT, Applied Science, and Nursing with low living costs.",
        "tuition_range": "NZD 21,000 - 24,500 / yr (~₹10.5L - ₹12.2L)",
        "university_fee": "NZD 22,500",
        "tuition_fee_currency": "NZD",
        "tuition_fee_min": 21000,
        "tuition_fee_max": 24500,
        "tuition_fee_inr": 1125000,
        "tuition_fee_enabled": True,
        "vfs_fee": "NZD 375 (~₹19,000)",
        "living_cost_monthly": "NZD 1,100 - 1,500 / mo",
        "programs": ["Bachelor of Information and Communication Technologies", "Bachelor of Engineering Technology", "Graduate Diploma in Information Technology", "Master of Applied Science"],
        "intakes": ["February 2027", "July 2027"],
        "nawa_required": False,
        "is_active": True
    }
]

print(f"Total destinations to inject: {len(DESTINATIONS)}")
print(f"Total universities to inject: {len(UNIVERSITIES)}")

# 1. Fetch existing destinations & universities to avoid duplicates
existing_dests = supabase_get('destinations', 'id,name,code')
existing_dest_names = {d['name'].strip().lower(): d['id'] for d in existing_dests if 'name' in d}

existing_unis = supabase_get('universities', 'id,name,country')
existing_uni_names = {u['name'].strip().lower(): u['id'] for u in existing_unis if 'name' in u}

# 2. Prepare new destinations
new_dests_to_insert = []
for d in DESTINATIONS:
    if d['name'].strip().lower() not in existing_dest_names:
        record = dict(d)
        record['id'] = str(uuid.uuid4())
        new_dests_to_insert.append(record)

print(f"New destinations to insert: {len(new_dests_to_insert)}")
inserted_dests = supabase_insert('destinations', new_dests_to_insert)

# Standard schema keys for universities
STANDARD_UNI_KEYS = {
    "name": "",
    "country": "",
    "city": "",
    "logo_url": "",
    "image_url": "",
    "banner_image_url": "",
    "badge": "Accredited Partner",
    "category": "Higher Education",
    "description": "",
    "ranking": 100,
    "rating": 4.8,
    "programs": [],
    "tuition_range": "",
    "intakes": [],
    "university_fee": "",
    "tuition_fee_enabled": True,
    "tuition_fee_currency": "EUR",
    "tuition_fee_min": 0,
    "tuition_fee_max": 0,
    "tuition_fee_pln": 0,
    "tuition_fee_eur": 0,
    "tuition_fee_usd": 0,
    "tuition_fee_inr": 0,
    "scholarship_percentage_max": 0,
    "direct_payment_instructions": "",
    "vfs_fee": "",
    "agency_fee": "₹25,000",
    "agency_fee_description": "Admission docket, SOP review, and visa consular clearance",
    "installments_enabled": False,
    "milestone_enabled": False,
    "living_cost_monthly": "",
    "nawa_required": False,
    "course_programs": [],
    "installments": [],
    "semesters": [],
    "is_active": True
}

# 3. Prepare new universities
new_unis_to_insert = []
for u in UNIVERSITIES:
    if u['name'].strip().lower() not in existing_uni_names:
        record = dict(STANDARD_UNI_KEYS)
        record['id'] = str(uuid.uuid4())
        record.update(u)
        new_unis_to_insert.append(record)

print(f"New universities to insert: {len(new_unis_to_insert)}")
inserted_unis = supabase_insert('universities', new_unis_to_insert)

print("\n--- INJECTION SUMMARY ---")
final_dests = supabase_get('destinations', 'id,name,code')
print(f"Total Destinations in Supabase now: {len(final_dests)}")
for d in final_dests:
    print(f"  [{d.get('code')}] {d.get('name')}")

final_unis = supabase_get('universities', 'id,name,country')
print(f"Total Universities in Supabase now: {len(final_unis)}")
print("SUCCESS!")
