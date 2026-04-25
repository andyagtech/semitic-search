"""Lexical index connection helper.

Two backends:
- **Turso (libsql)** when TURSO_DATABASE_URL is set — used in production and
  by the web backend.
- **Local SQLite file** for dev and ingest — used when TURSO_* env vars are
  absent. Path defaults to data/processed/semitic.sqlite3.

Both expose a minimal `Db` wrapper with `.execute(sql, params=())` returning
a list of row-tuples, plus `.executemany(sql, seq)` and `.commit()`. This
is enough for the read-mostly query surface we need for /api/lookup,
/api/roots, and /api/cross-root, and for writes during ingest.
"""

from __future__ import annotations

import os
import sqlite3
from pathlib import Path
from typing import Any, Iterable, Sequence

from dotenv import load_dotenv

DEFAULT_LOCAL_PATH = Path(__file__).resolve().parents[2] / "data" / "processed" / "semitic.sqlite3"


class Db:
    """Tiny abstraction so ingest + search don't care which backend they hit.

    Both libsql-experimental and stdlib sqlite3 expose nearly the same
    DB-API 2.0 surface (connect → cursor → execute/executemany/fetch), so this
    wrapper is thin.
    """

    def __init__(self, backend: str, conn: Any) -> None:
        self.backend = backend
        self._conn = conn

    def execute(self, sql: str, params: Sequence[Any] = ()) -> list[tuple]:
        cur = self._conn.cursor()
        cur.execute(sql, tuple(params))
        try:
            return list(cur.fetchall())
        except Exception:
            return []

    def executemany(self, sql: str, seq: Iterable[Sequence[Any]]) -> None:
        cur = self._conn.cursor()
        cur.executemany(sql, list(seq))

    def executescript(self, script: str) -> None:
        cur = self._conn.cursor()
        # libsql-experimental may not support executescript; run statement by statement.
        for stmt in (s.strip() for s in script.split(";") if s.strip()):
            cur.execute(stmt)

    def commit(self) -> None:
        self._conn.commit()

    def close(self) -> None:
        self._conn.close()


def connect(*, prefer: str | None = None, local_path: Path | None = None) -> Db:
    """Return a Db connected per env (Turso when configured, local SQLite otherwise).

    prefer="local" forces the local SQLite path.
    prefer="turso" forces remote; errors if env vars missing.
    prefer=None uses Turso if both env vars are set, else local.
    """
    load_dotenv()
    if prefer == "local":
        return _connect_local(local_path)

    url = os.environ.get("TURSO_DATABASE_URL")
    token = os.environ.get("TURSO_AUTH_TOKEN")
    if prefer == "turso" or (url and token and prefer is None):
        if not url or not token:
            raise RuntimeError("Turso selected but TURSO_DATABASE_URL/TOKEN missing in .env")
        import libsql_experimental as libsql

        conn = libsql.connect(database=url, auth_token=token)
        return Db("turso", conn)

    return _connect_local(local_path)


def _connect_local(local_path: Path | None) -> Db:
    path = local_path or DEFAULT_LOCAL_PATH
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    return Db("sqlite", conn)
