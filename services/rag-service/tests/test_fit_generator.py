import sys
import types
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

google_module = types.ModuleType("google")
genai_module = types.ModuleType("google.genai")
genai_types_module = types.ModuleType("google.genai.types")
genai_module.Client = object
genai_types_module.HttpOptions = object
genai_types_module.Content = object
genai_types_module.Part = object
genai_types_module.GenerateContentConfig = object
genai_module.types = genai_types_module
google_module.genai = genai_module
sys.modules.setdefault("google", google_module)
sys.modules.setdefault("google.genai", genai_module)
sys.modules.setdefault("google.genai.types", genai_types_module)

from rag.fit_generator import fallback_fit_draft, normalize_fit_payload


class FitGeneratorTest(unittest.TestCase):
    def test_normalize_marks_complete_evidenced_fit_as_verified(self):
        result = normalize_fit_payload(
            {
                "bestFor": ["Students reviewing derivatives"],
                "notFor": ["Students looking for complete exam answers"],
                "startHere": [{"title": "Read the recap", "order": 1}],
                "fitEvidence": [
                    {
                        "claim": "Draft based on extracted resource metadata",
                        "sourceType": "CONTENT_EXTRACTION",
                        "sourceRef": "resource:derivatives",
                        "confidence": 0.82,
                    }
                ],
            }
        )

        self.assertEqual(result["fitStatus"], "VERIFIED")
        self.assertIsNotNone(result["fitVerifiedAt"])
        self.assertEqual(result["fitEvidence"][0]["sourceType"], "CONTENT_EXTRACTION")

    def test_normalize_marks_complete_fit_without_evidence_as_needs_evidence(self):
        result = normalize_fit_payload(
            {
                "bestFor": ["Students reviewing derivatives"],
                "notFor": ["Students looking for complete exam answers"],
                "startHere": [{"title": "Read the recap", "order": 1}],
            }
        )

        self.assertEqual(result["fitStatus"], "NEEDS_EVIDENCE")
        self.assertIsNone(result["fitVerifiedAt"])

    def test_normalize_marks_incomplete_fit_as_draft(self):
        result = normalize_fit_payload({"coveredTopics": ["Derivatives"]})

        self.assertEqual(result["fitStatus"], "DRAFT")
        self.assertEqual(result["bestFor"], [])

    def test_fallback_draft_includes_metadata_evidence(self):
        result = fallback_fit_draft(
            {
                "contentType": "RESOURCE",
                "title": "Calculus Review",
                "hightlights": ["Derivatives", "Limits"],
            },
            [{"itemId": "resource-1", "slug": "calculus-review"}],
        )

        self.assertEqual(result["fitStatus"], "VERIFIED")
        self.assertEqual(result["fitEvidence"][0]["sourceType"], "METADATA")
        self.assertEqual(result["fitEvidence"][0]["sourceRef"], "resource-1")


if __name__ == "__main__":
    unittest.main()
