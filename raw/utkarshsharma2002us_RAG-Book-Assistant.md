---
title: "utkarshsharma2002us/RAG-Book-Assistant"
source: "https://github.com/utkarshsharma2002us/RAG-Book-Assistant"
author:
published:
created: 2026-08-28
description: "Contribute to utkarshsharma2002us/RAG-Book-Assistant development by creating an account on GitHub."
tags:
  - "clippings"
---
## RAG Book Assistant

An intelligent **Retrieval-Augmented Generation (RAG)** application built with **Streamlit** that allows users to upload a PDF book and ask natural language questions about its content.

---

## Introduction

**RAG Book Assistant** is a smart document-based Q&A system that combines the power of **LLMs (Large Language Models)** with **vector search**. Instead of relying on general knowledge, it answers questions strictly based on the uploaded PDF — making it highly accurate and context-aware.

Whether you're studying, researching, or exploring a book, this tool helps you extract insights instantly without manually searching through pages.

---

## Features

- 📄 Upload any PDF document
- 🧠 Automatically processes and understands the content
- 🔍 Semantic search using vector embeddings
- 💬 Ask questions in natural language
- 🎯 Answers strictly based on document context
- ⚡ Fast and interactive UI with Streamlit
- 💾 Persistent vector database using Chroma

---

## IMAGES

[![Screenshot 2026-04-11 083717](https://private-user-images.githubusercontent.com/267592288/576896439-70075174-b045-48d5-98c2-bd44eb7c9915.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3ODc5MjEwNDYsIm5iZiI6MTc4NzkyMDc0NiwicGF0aCI6Ii8yNjc1OTIyODgvNTc2ODk2NDM5LTcwMDc1MTc0LWIwNDUtNDhkNS05OGMyLWJkNDRlYjdjOTkxNS5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwODI4JTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDgyOFQxMjM5MDZaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT05OGI5NGVhMzdmZThmNDQ1OTY3N2ZkZmU2YjA5ODQ1MDcyMWNjMDA2Y2Q3ZjdjMTgzZTA2Y2FmYTZjMTA0ZDk3JlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.8ermBb0FHpd6iJtAjvj1Tf1N1AhJ-a_1UzQdPwOCsx0)](https://private-user-images.githubusercontent.com/267592288/576896439-70075174-b045-48d5-98c2-bd44eb7c9915.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3ODc5MjEwNDYsIm5iZiI6MTc4NzkyMDc0NiwicGF0aCI6Ii8yNjc1OTIyODgvNTc2ODk2NDM5LTcwMDc1MTc0LWIwNDUtNDhkNS05OGMyLWJkNDRlYjdjOTkxNS5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwODI4JTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDgyOFQxMjM5MDZaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT05OGI5NGVhMzdmZThmNDQ1OTY3N2ZkZmU2YjA5ODQ1MDcyMWNjMDA2Y2Q3ZjdjMTgzZTA2Y2FmYTZjMTA0ZDk3JlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.8ermBb0FHpd6iJtAjvj1Tf1N1AhJ-a_1UzQdPwOCsx0)  
  
[![Screenshot 2026-04-11 083934](https://private-user-images.githubusercontent.com/267592288/576896464-d6014488-53b5-49cb-a7ab-ec3826b325f1.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3ODc5MjEwNDYsIm5iZiI6MTc4NzkyMDc0NiwicGF0aCI6Ii8yNjc1OTIyODgvNTc2ODk2NDY0LWQ2MDE0NDg4LTUzYjUtNDljYi1hN2FiLWVjMzgyNmIzMjVmMS5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwODI4JTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDgyOFQxMjM5MDZaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT1mNDY2YjUyNzA2ZjU1ZWFmY2ZiMjNkNDM0MTBhN2Y0MGRmMTQ4ZTVhMzdiYjM5YjY3ZmIyZDYwMDVlYWJjZjVjJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.KmJHrmedkHqZPqAWyt5UgFzzDF-R8TWa86T0p4LpNCI)](https://private-user-images.githubusercontent.com/267592288/576896464-d6014488-53b5-49cb-a7ab-ec3826b325f1.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3ODc5MjEwNDYsIm5iZiI6MTc4NzkyMDc0NiwicGF0aCI6Ii8yNjc1OTIyODgvNTc2ODk2NDY0LWQ2MDE0NDg4LTUzYjUtNDljYi1hN2FiLWVjMzgyNmIzMjVmMS5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwODI4JTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDgyOFQxMjM5MDZaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT1mNDY2YjUyNzA2ZjU1ZWFmY2ZiMjNkNDM0MTBhN2Y0MGRmMTQ4ZTVhMzdiYjM5YjY3ZmIyZDYwMDVlYWJjZjVjJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZyZXNwb25zZS1jb250ZW50LXR5cGU9aW1hZ2UlMkZwbmcifQ.KmJHrmedkHqZPqAWyt5UgFzzDF-R8TWa86T0p4LpNCI)

## Tech Stack

- **Frontend/UI:** Streamlit
- **LLM:** Mistral AI (Chat + Embeddings)
- **Vector Database:** Chroma
- **Document Processing:** LangChain
- **Text Splitting:** Recursive Character Text Splitter

---

## How It Works

1. Upload a PDF file
2. The document is:
	- Loaded and parsed
		- Split into smaller chunks
		- Converted into embeddings
3. Embeddings are stored in a vector database
4. When a question is asked:
	- Relevant chunks are retrieved
		- Context is passed to the LLM
		- LLM generates a precise answer

---

## Project Structure

```
📁 RAG-Book-Assistant
│── app.py
│── chroma_db/        # Vector database (auto-created)
│── .env              # API keys
│── requirements.txt
│── README.md
```

---

## Setup Instructions

### 1\. Clone the Repository

```
git clone https://github.com/utkarshsharma2002us/RAG-Book-Assistant.git
cd RAG-Book-Assistant
```

### 2\. Create Virtual Environment

```
python -m venv venv
source venv/bin/activate   # For Mac/Linux
venv\Scripts\activate      # For Windows
```

### 3\. Install Dependencies

```
pip install -r requirements.txt
```

### 4\. Add Environment Variables

Create a `.env` file:

```
MISTRAL_API_KEY=your_api_key_here
```

---

## Run the App

```
streamlit run app.py
```

---

## Usage

1. Upload a PDF book
2. Click **"Create Vector Database"**
3. Ask any question related to the document
4. Get accurate, context-based answers

---

## Example Use Cases

- 📚 Studying textbooks
- 📊 Extracting insights from reports
- 📖 Research paper analysis
- 🧾 Understanding documentation

---

## Limitations

- Answers depend strictly on document content
- Large PDFs may take longer to process
- Requires API key for LLM and embeddings

---

## Future Improvements

- Multi-PDF support
- Chat history memory
- Highlight source references
- UI enhancements
- Deployment (Cloud / Docker)

---

## Contributing

Contributions are welcome! Feel free to fork the repo and submit a pull request.

---

## License

This project is open-source and available under the MIT License.

---

## Final Note

This project demonstrates how powerful **RAG systems** can be when combined with modern LLMs. It’s a great starting point for building advanced AI-powered document assistants.

---

⭐ If you like this project, don't forget to star the repo! ⭐