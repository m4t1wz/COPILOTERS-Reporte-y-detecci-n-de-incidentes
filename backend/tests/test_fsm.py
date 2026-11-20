"""Máquina de estados de reportes (docs/02. system-contracts.md §6; docs/03. backend.md §4.4)."""
import itertools

import pytest

from core.exceptions import InvalidStateTransitionException, ValidationErrorException
from services.report_service import (
    ALLOWED_TRANSITIONS,
    affects_clusters,
    validate_admin_comment,
    validate_transition,
)

STATUSES = ["pendiente", "en_revision", "verificado", "descartado", "en_seguimiento", "resuelto"]

VALID = {
    ("pendiente", "en_revision"),
    ("pendiente", "descartado"),
    ("en_revision", "verificado"),
    ("en_revision", "descartado"),
    ("verificado", "en_seguimiento"),
    ("verificado", "resuelto"),
    ("verificado", "descartado"),
    ("en_seguimiento", "resuelto"),
    ("en_seguimiento", "descartado"),
}


def test_transition_table_matches_contract():
    declared = {(src, dst) for src, dsts in ALLOWED_TRANSITIONS.items() for dst in dsts}
    assert declared == VALID


@pytest.mark.parametrize("src,dst", sorted(VALID))
def test_valid_transitions(src, dst):
    validate_transition(src, dst)


@pytest.mark.parametrize("src,dst", sorted(set(itertools.product(STATUSES, STATUSES)) - VALID))
def test_invalid_transitions_raise_409(src, dst):
    with pytest.raises(InvalidStateTransitionException) as exc:
        validate_transition(src, dst)
    assert exc.value.status_code == 409
    assert exc.value.code == "INVALID_STATE_TRANSITION"


def test_pendiente_to_resuelto_is_rejected():
    with pytest.raises(InvalidStateTransitionException):
        validate_transition("pendiente", "resuelto")


@pytest.mark.parametrize("status", ["en_revision", "en_seguimiento", "descartado"])
@pytest.mark.parametrize("comment", [None, "", "   "])
def test_admin_comment_required(status, comment):
    with pytest.raises(ValidationErrorException) as exc:
        validate_admin_comment(status, comment)
    assert exc.value.status_code == 422
    assert exc.value.code == "VALIDATION_ERROR"


@pytest.mark.parametrize("status", ["verificado", "resuelto"])
def test_admin_comment_optional(status):
    validate_admin_comment(status, None)


def test_cluster_recalculation_trigger():
    assert affects_clusters("en_revision", "verificado")
    assert affects_clusters("verificado", "en_seguimiento")
    assert affects_clusters("en_seguimiento", "resuelto")
    assert affects_clusters("verificado", "descartado")
    assert not affects_clusters("pendiente", "en_revision")
    assert not affects_clusters("pendiente", "descartado")
