I have successfully configured and improved the AI Agent project to ensure it runs correctly and produces high-quality fixes.

### 🛠️ Improvements Made

1.  **Fixed AI Integration**:
    *   Updated `agent/tools/gemini_tools.py` to use the **official Google Gemini client** (`langchain-google-genai`) instead of the incorrect OpenRouter configuration.
    *   Improved the prompts to ensure the AI generates cleaner code fixes without syntax errors or markdown artifacts.

2.  **Enhanced Environment Stability**:
    *   Updated **`agent/Dockerfile`** to include **Node.js** and **npm** alongside Python. This means the agent can now fix JavaScript/TypeScript projects (Jest/Mocha), not just Python ones.
    *   Added a **`frontend/Dockerfile.dev`** and updated **`docker-compose.yml`** so the full stack (Frontend + Agent) starts reliably with a single command.

3.  **Simplified Setup**:
    *   Consolidated the backend logic into the Python agent (removing the missing Node.js backend dependency).
    *   Created `setup_dev.bat` and `start_dev.bat` scripts for easy local development on Windows.
    *   Added a `.env` template file at the root.

### 🚀 How to Start

1.  **Configure API Keys**:
    Open the `.env` file in the root directory and add your keys:
    ```ini
    GOOGLE_API_KEY=your_gemini_key
    GITHUB_TOKEN=your_github_pat
    MONGODB_URI=your_mongodb_uri
    ```

2.  **Run with Docker (Recommended)**:
    ```bash
    docker-compose up --build
    ```
    - **Frontend**: http://localhost:3000
    - **Agent API**: http://localhost:8000

3.  **Or Run Locally (No Docker)**:
    - Run `setup_dev.bat` to install dependencies.
    - Run `start_dev.bat` to launch both services.

The system is now ready to autonomously heal CI/CD failures! Let me know if you need help getting an API key or running the first test.