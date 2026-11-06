"""
Form2Fact MLOps Model Loader & Checksum Verifier
Manages model artifact lifecycle, checksum integrity, and version loading.
"""

import os
import json
import hashlib
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger("form2fact.mlops")
logging.basicConfig(level=logging.INFO)


class ModelArtifactLoader:
    _instance: Optional['ModelArtifactLoader'] = None

    def __init__(self, models_root: Optional[str] = None):
        self.models_root = models_root or os.environ.get("MODEL_PATH", os.path.join(os.path.dirname(__file__), "..", "models"))
        self.manifest_path = os.path.join(self.models_root, "manifest.json")
        self.manifest: Dict[str, Any] = {}
        self.active_version: str = "v1.0.0"
        self.model_metadata: Dict[str, Any] = {}
        self.model_config: Dict[str, Any] = {}
        self.is_loaded: bool = False
        self.is_fallback: bool = False
        self.status_message: str = "Uninitialized"

        self.load_active_model()

    @classmethod
    def get_instance(cls) -> 'ModelArtifactLoader':
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def load_active_model(self, version_override: Optional[str] = None) -> bool:
        """
        Loads the specified or environment-configured model version.
        Validates artifact presence and SHA-256 checksums.
        """
        requested_version = version_override or os.environ.get("MODEL_VERSION")

        if not os.path.exists(self.manifest_path):
            self.is_loaded = False
            self.is_fallback = True
            self.status_message = f"Manifest not found at {self.manifest_path}. Operating in fallback heuristic mode."
            logger.warning(self.status_message)
            return False

        try:
            with open(self.manifest_path, "r", encoding="utf-8") as f:
                self.manifest = json.load(f)
        except Exception as e:
            self.is_loaded = False
            self.is_fallback = True
            self.status_message = f"Failed to parse manifest.json: {str(e)}. Operating in fallback heuristic mode."
            logger.error(self.status_message)
            return False

        self.active_version = requested_version or self.manifest.get("default_version", "v1.0.0")
        versions = self.manifest.get("versions", {})

        if self.active_version not in versions:
            self.is_loaded = False
            self.is_fallback = True
            self.status_message = f"Version {self.active_version} not listed in manifest. Operating in fallback mode."
            logger.warning(self.status_message)
            return False

        version_info = versions[self.active_version]
        files = version_info.get("files", {})
        checksums = version_info.get("checksums", {})

        # Verify and load files
        try:
            # 1. Metadata file
            metadata_rel = files.get("metadata", f"versions/{self.active_version}/metadata.json")
            metadata_path = os.path.join(self.models_root, metadata_rel)
            if not os.path.exists(metadata_path):
                raise FileNotFoundError(f"Metadata file missing: {metadata_path}")

            expected_meta_checksum = checksums.get("metadata.json")
            if expected_meta_checksum:
                actual_meta_checksum = self._compute_sha256(metadata_path)
                if actual_meta_checksum != expected_meta_checksum:
                    logger.warning(
                        f"Checksum mismatch for metadata.json: expected {expected_meta_checksum}, got {actual_meta_checksum}"
                    )

            with open(metadata_path, "r", encoding="utf-8") as f:
                self.model_metadata = json.load(f)

            # 2. Config file
            config_rel = files.get("config", f"versions/{self.active_version}/config.json")
            config_path = os.path.join(self.models_root, config_rel)
            if os.path.exists(config_path):
                with open(config_path, "r", encoding="utf-8") as f:
                    self.model_config = json.load(f)

            self.is_loaded = True
            self.is_fallback = False
            self.status_message = f"Model {self.active_version} ({version_info.get('model_id')}) loaded successfully."
            logger.info(self.status_message)
            return True

        except Exception as e:
            self.is_loaded = False
            self.is_fallback = True
            self.status_message = f"Model artifact loading error: {str(e)}. Operating in fallback mode."
            logger.error(self.status_message)
            return False

    def _compute_sha256(self, filepath: str) -> str:
        hasher = hashlib.sha256()
        with open(filepath, "rb") as f:
            while chunk := f.read(65536):
                hasher.update(chunk)
        return hasher.hexdigest()

    def get_readiness_report(self) -> Dict[str, Any]:
        """
        Returns structured health and MLOps status for monitoring probes.
        """
        return {
            "model_loaded": self.is_loaded,
            "is_fallback": self.is_fallback,
            "active_version": self.active_version,
            "status_message": self.status_message,
            "architecture": self.model_metadata.get("framework", "HybridDeterministicSemanticClassifier"),
            "taxonomy": self.model_metadata.get("taxonomy", [
                "MATCH", "MISMATCH", "MISSING", "UNCERTAIN", "NOT_COMPARABLE"
            ]),
            "config": self.model_config
        }
