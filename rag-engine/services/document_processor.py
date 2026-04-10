import os
import re
from typing import Optional
from pathlib import Path

from PyPDF2 import PdfReader
from docx import Document as DocxDocument

from config import get_settings

settings = get_settings()


class DocumentProcessor:
    def __init__(self):
        self.upload_dir = settings.UPLOAD_DIR

    def extract_text(self, file_path: str) -> str:
        ext = Path(file_path).suffix.lower()
        if ext == ".pdf":
            return self._extract_pdf(file_path)
        elif ext in (".docx", ".doc"):
            return self._extract_docx(file_path)
        elif ext in (".txt", ".md"):
            return self._extract_text(file_path)
        else:
            raise ValueError(f"Unsupported file type: {ext}")

    def _extract_pdf(self, file_path: str) -> str:
        reader = PdfReader(file_path)
        texts = []
        for page in reader.pages:
            text = page.extract_text()
            if text:
                texts.append(text)
        return "\n\n".join(texts)

    def _extract_docx(self, file_path: str) -> str:
        doc = DocxDocument(file_path)
        texts = []
        for para in doc.paragraphs:
            if para.text.strip():
                texts.append(para.text)
        for table in doc.tables:
            for row in table.rows:
                row_text = " | ".join(cell.text.strip() for cell in row.cells)
                if row_text.strip():
                    texts.append(row_text)
        return "\n\n".join(texts)

    def _extract_text(self, file_path: str) -> str:
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            return f.read()

    def chunk_text(
        self,
        text: str,
        chunk_size: Optional[int] = None,
        chunk_overlap: Optional[int] = None,
    ) -> list[dict]:
        chunk_size = chunk_size or settings.CHUNK_SIZE
        chunk_overlap = chunk_overlap or settings.CHUNK_OVERLAP

        text = re.sub(r"\s+", " ", text).strip()
        if not text:
            return []

        chunks = []
        start = 0
        index = 0

        while start < len(text):
            end = start + chunk_size
            chunk_text = text[start:end]

            if end < len(text):
                last_period = chunk_text.rfind(".")
                last_newline = chunk_text.rfind("\n")
                last_space = chunk_text.rfind(" ")
                split_at = max(last_period, last_newline, last_space)
                if split_at > start + chunk_size * 0.5:
                    chunk_text = text[start : split_at + 1]
                    end = split_at + 1

            chunks.append(
                {
                    "index": index,
                    "content": chunk_text.strip(),
                    "start_char": start,
                    "end_char": start + len(chunk_text),
                }
            )
            start = end - chunk_overlap
            index += 1

        return chunks

    def process_document(self, file_path: str) -> list[dict]:
        text = self.extract_text(file_path)
        chunks = self.chunk_text(text)
        return chunks
