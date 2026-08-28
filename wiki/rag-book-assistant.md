# RAG Book Assistant

**Summary**: Intelligent Retrieval-Augmented Generation application that enables natural language Q&A over PDF documents using semantic search, vector embeddings, and LLMs. Built with Streamlit, LangChain, Mistral AI, and Chroma DB.

**Sources**:
- raw/Utkarsh Sharma.md
- raw/utkarshsharma2002us_RAG-Book-Assistant.md

**Last updated**: 2026-08-28

---

## Overview

RAG Book Assistant is a smart document-based Q&A system that combines the power of Large Language Models (LLMs) with vector search. Instead of relying on general knowledge, it answers questions strictly based on the uploaded PDF content — making it highly accurate and context-aware.

Whether studying, researching, or exploring a book, this tool helps extract insights instantly without manually searching through pages.

(source: utkarshsharma2002us_RAG-Book-Assistant.md, Utkarsh Sharma.md)

---

## Features

- Upload any PDF document
- Automatically processes and understands the content
- Semantic search using vector embeddings
- Ask questions in natural language
- Answers strictly based on document context
- Fast and interactive UI with Streamlit
- Persistent vector database using Chroma

(source: utkarshsharma2002us_RAG-Book-Assistant.md)

---

## Technical Stack

### Frontend/UI
- **Streamlit** - Web application framework

### LLM & AI
- **Mistral AI** - Large Language Model (Chat + Embeddings)
- **LangChain** - LLM orchestration and document processing

### Data & Storage
- **Chroma DB** - Vector database for embeddings
- **Recursive Character Text Splitter** - Document chunking strategy

### Language
- **Python**

(source: utkarshsharma2002us_RAG-Book-Assistant.md, Utkarsh Sharma.md)

---

## How It Works

1. **Upload a PDF file**
2. **Document Processing**:
   - Loaded and parsed
   - Split into smaller chunks
   - Converted into embeddings
3. **Storage**: Embeddings stored in vector database (Chroma)
4. **Query Processing**:
   - Relevant chunks are retrieved based on semantic similarity
   - Context is passed to the LLM
   - LLM generates a precise, document-grounded answer

(source: utkarshsharma2002us_RAG-Book-Assistant.md)

---

## Project Structure

```
RAG-Book-Assistant
|-- app.py                    # Main application
|-- chroma_db/               # Vector database (auto-created)
|-- .env                     # API keys
|-- requirements.txt          # Python dependencies
|-- README.md
```

(source: utkarshsharma2002us_RAG-Book-Assistant.md)

---

## Setup Instructions

### 1. Clone the Repository
```bash
git clone https://github.com/utkarshsharma2002us/RAG-Book-Assistant.git
cd RAG-Book-Assistant
```

### 2. Create Virtual Environment
```bash
python -m venv venv
source venv/bin/activate   # For Mac/Linux
venv\Scripts\activate      # For Windows
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Add Environment Variables
Create a `.env` file:
```
MISTRAL_API_KEY=your_api_key_here
```

### 5. Run the App
```bash
streamlit run app.py
```

(source: utkarshsharma2002us_RAG-Book-Assistant.md)

---

## Usage

1. Upload a PDF book
2. Click "Create Vector Database"
3. Ask any question related to the document
4. Get accurate, context-based answers

(source: utkarshsharma2002us_RAG-Book-Assistant.md)

---

## Example Use Cases

- Studying textbooks
- Extracting insights from reports
- Research paper analysis
- Understanding documentation

(source: utkarshsharma2002us_RAG-Book-Assistant.md)

---

## Limitations

- Answers depend strictly on document content (no external knowledge)
- Large PDFs may take longer to process
- Requires API key for LLM and embeddings

(source: utkarshsharma2002us_RAG-Book-Assistant.md)

---

## Future Improvements

- Multi-PDF support
- Chat history memory
- Highlight source references
- UI enhancements
- Deployment (Cloud / Docker)

(source: utkarshsharma2002us_RAG-Book-Assistant.md)

---

## Benefits

- **Accuracy**: Answers are based on actual document content
- **Efficiency**: Eliminates manual document search
- **Context Awareness**: Understands context from the documents
- **Scalability**: Can handle multiple documents and large knowledge bases

(source: Utkarsh Sharma.md)

---

## Skills Demonstrated

- Retrieval-Augmented Generation (RAG)
- Vector databases (Chroma DB)
- Large Language Models (LLMs)
- Prompt engineering
- Web application development (Streamlit)
- Python programming
- Document processing pipelines
- Embedding generation and management

(source: Utkarsh Sharma.md)

---

## Screenshots

The project includes visual documentation with screenshots showing:
- Application interface
- PDF upload functionality
- Question answering workflow

(source: utkarshsharma2002us_RAG-Book-Assistant.md)

---

## License

This project is open-source and available under the MIT License.

(source: utkarshsharma2002us_RAG-Book-Assistant.md)

---

## Related pages

- [[Utkarsh Sharma]]
- [[Projects]]
- [[Python]]
- [[AI/ML]]
- [[Streamlit]]
- [[LangChain]]
- [[Chroma DB]]
