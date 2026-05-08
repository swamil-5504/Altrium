"""Seed list of accredited Indian institutions used to gate admin registration.

Idempotent: only inserts if the collection is empty, so re-running on deploy
will not overwrite or duplicate anything. Super-admin can manually add more
institutions to the Mongo collection later without conflicting with this seed.
"""
from app.models.models import Institution


# Source: UGC + AICTE accreditation lists (canonical names). Names must match
# exactly what admins type during registration; abbreviations are kept as
# separate entries where they're common ("IIT Bombay" vs the full name).
SEED_INSTITUTIONS = [
    # IITs
    ("Indian Institute of Technology Bombay", "IIT-BOM", "MoE"),
    ("Indian Institute of Technology Delhi", "IIT-DEL", "MoE"),
    ("Indian Institute of Technology Madras", "IIT-MAD", "MoE"),
    ("Indian Institute of Technology Kanpur", "IIT-KAN", "MoE"),
    ("Indian Institute of Technology Kharagpur", "IIT-KGP", "MoE"),
    ("Indian Institute of Technology Roorkee", "IIT-ROO", "MoE"),
    ("Indian Institute of Technology Guwahati", "IIT-GUW", "MoE"),
    ("Indian Institute of Technology Hyderabad", "IIT-HYD", "MoE"),
    # NITs
    ("National Institute of Technology Trichy", "NIT-TRY", "MoE"),
    ("National Institute of Technology Surathkal", "NIT-SUR", "MoE"),
    ("National Institute of Technology Warangal", "NIT-WAR", "MoE"),
    ("National Institute of Technology Calicut", "NIT-CAL", "MoE"),
    # IIITs
    ("Indian Institute of Information Technology Hyderabad", "IIIT-HYD", "MoE"),
    ("Indian Institute of Information Technology Bangalore", "IIIT-BLR", "MoE"),
    # IIMs
    ("Indian Institute of Management Ahmedabad", "IIM-AHM", "MoE"),
    ("Indian Institute of Management Bangalore", "IIM-BLR", "MoE"),
    ("Indian Institute of Management Calcutta", "IIM-CAL", "MoE"),
    # Central / State universities
    ("University of Delhi", "UGC-DU", "UGC"),
    ("Jawaharlal Nehru University", "UGC-JNU", "UGC"),
    ("University of Mumbai", "UGC-MU", "UGC"),
    ("University of Pune", "UGC-PU", "UGC"),
    ("Savitribai Phule Pune University", "UGC-SPPU", "UGC"),
    ("Anna University", "UGC-ANNA", "UGC"),
    ("Banaras Hindu University", "UGC-BHU", "UGC"),
    ("Aligarh Muslim University", "UGC-AMU", "UGC"),
    ("Jamia Millia Islamia", "UGC-JMI", "UGC"),
    ("University of Calcutta", "UGC-CU", "UGC"),
    ("University of Madras", "UGC-MDS", "UGC"),
    ("Osmania University", "UGC-OU", "UGC"),
    # Deemed / private
    ("Birla Institute of Technology and Science Pilani", "AICTE-BITS", "AICTE"),
    ("Vellore Institute of Technology", "AICTE-VIT", "AICTE"),
    ("Manipal Academy of Higher Education", "AICTE-MAHE", "AICTE"),
    ("SRM Institute of Science and Technology", "AICTE-SRM", "AICTE"),
    ("Symbiosis International University", "AICTE-SIU", "AICTE"),
    ("Amity University", "AICTE-AMITY", "AICTE"),
    ("Lovely Professional University", "AICTE-LPU", "AICTE"),
    ("Thapar Institute of Engineering and Technology", "AICTE-TIET", "AICTE"),
    ("PES University", "AICTE-PES", "AICTE"),
    ("Ashoka University", "UGC-ASH", "UGC"),
    ("Krea University", "UGC-KREA", "UGC"),
    # Common engineering colleges (representative)
    ("College of Engineering Pune", "AICTE-COEP", "AICTE"),
    ("Veermata Jijabai Technological Institute", "AICTE-VJTI", "AICTE"),
    ("Dwarkadas J. Sanghvi College of Engineering", "AICTE-DJSCE", "AICTE"),
    ("K. J. Somaiya College of Engineering", "AICTE-KJSCE", "AICTE"),
    ("Sardar Patel Institute of Technology", "AICTE-SPIT", "AICTE"),
    ("Vidyalankar Institute of Technology", "AICTE-VIT-MUM", "AICTE"),
    # Demo fallback so the seed superadmin's existing test data still resolves
    ("Altrium University", "DEMO", "DEMO"),
]


async def seed_institutions_if_empty() -> int:
    """Returns the number of institutions inserted (0 if already seeded)."""
    existing = await Institution.find_one({})
    if existing is not None:
        return 0

    docs = [
        Institution(
            name=name,
            accreditation_id=acc_id,
            accreditation_body=body,
            country="IN",
            is_active=True,
        )
        for name, acc_id, body in SEED_INSTITUTIONS
    ]
    await Institution.insert_many(docs)
    return len(docs)
