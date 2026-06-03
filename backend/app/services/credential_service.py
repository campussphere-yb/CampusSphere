# services/credential_service.py
# Resolves a (credential_store, credential_ref) pair into the actual secret value.
#
# This is the ONLY place in the codebase that touches real credentials.
# All other code passes the opaque (store, ref) pair and calls resolve_credentials().
#
# To add a new backend (e.g. GCP Secret Manager, Azure Key Vault):
#   1. Add an entry to the CredentialStore enum in models/connector.py
#   2. Add a branch in resolve_credentials() below
#   3. Nothing else changes.

import os
from app.models.connector import CredentialStore


def resolve_credentials(
    credential_store: CredentialStore,
    credential_ref: str | None,
) -> str:
    """
    Return the resolved credential value for a connector.

    Parameters
    ----------
    credential_store : CredentialStore
        Indicates where the secret is stored.
    credential_ref : str | None
        The reference to look up (env var name, ARN, vault path, etc.)

    Returns
    -------
    str
        The actual secret value — handle with care, do not log.
    """
    if credential_store == CredentialStore.mock:
        # Safe placeholder — never a real secret. Fine for dev and CI.
        return f"[mock-credential:{credential_ref or 'unnamed'}]"

    if credential_store == CredentialStore.env_var:
        if not credential_ref:
            raise ValueError(
                "credential_ref must be an environment variable name "
                "when credential_store is 'env_var'."
            )
        value = os.environ.get(credential_ref)
        if not value:
            raise ValueError(
                f"Environment variable '{credential_ref}' is not set or is empty. "
                "Ensure it is exported before starting the server."
            )
        return value

    if credential_store == CredentialStore.secrets_manager:
        # TODO: implement using boto3 (AWS), google-cloud-secret-manager (GCP),
        #       or azure-keyvault-secrets (Azure).
        # Example AWS SSM shape for credential_ref:
        #   "arn:aws:ssm:us-east-1:123456789012:parameter/campussphere/prod/twitter"
        raise NotImplementedError(
            "secrets_manager resolver is not yet implemented. "
            "Use credential_store='env_var' in the meantime."
        )

    if credential_store == CredentialStore.vault:
        # TODO: implement using the hvac library (HashiCorp Vault).
        # Example credential_ref shape: "secret/campussphere/prod/twitter"
        raise NotImplementedError(
            "vault resolver is not yet implemented. "
            "Use credential_store='env_var' in the meantime."
        )

    raise ValueError(f"Unknown credential_store value: '{credential_store}'")
