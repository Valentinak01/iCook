"""Erzeugt iCook-Vorschau.html: eine einzelne Datei, die ohne Node.js im Browser läuft.

React und Babel werden dabei per CDN geladen (Internetverbindung nötig), der App-Code
wird aus src/ zusammengefügt. Aufruf:  python build-standalone.py
"""
import re
from pathlib import Path

ROOT = Path(__file__).parent
SRC = ROOT / "src"
ORDER = [
    "utils.js",
    "data/sampleData.js",
    "config.js",
    "lib/supabase.js",
    "lib/remote.js",
    "store.jsx",
    "router.jsx",
    "components/Icon.jsx",
    "components/ui.jsx",
    "components/ImageFramer.jsx",
    "components/RecipeCard.jsx",
    "components/CategoryEditor.jsx",
    "components/Layout.jsx",
    "pages/HomePage.jsx",
    "pages/RecipesPage.jsx",
    "pages/CategoriesPage.jsx",
    "pages/ShoppingListPage.jsx",
    "pages/RecipeDetailPage.jsx",
    "pages/CookingModePage.jsx",
    "pages/RecipeFormPage.jsx",
    "pages/SettingsPage.jsx",
    "App.jsx",
]

parts = []
for rel in ORDER:
    code = (SRC / rel).read_text(encoding="utf-8")
    code = re.sub(r"^import .*?;\s*$", "", code, flags=re.M)
    code = re.sub(r"^export default ", "", code, flags=re.M)
    code = re.sub(r"^export ", "", code, flags=re.M)
    parts.append(f"// ===== {rel} =====\n{code}")

prelude = (
    "const { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } = React;\n"
    "const { createPortal } = ReactDOM;\n"
    "const createClient = window.supabase ? window.supabase.createClient : undefined;\n"
)
bootstrap = "\nReactDOM.createRoot(document.getElementById('root')).render(<App />);\n"
app_code = prelude + "\n".join(parts) + bootstrap
css = (SRC / "styles.css").read_text(encoding="utf-8")

html = f"""<!doctype html>
<html lang="de">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<meta name="theme-color" content="#0a0d09" />
<title>iCook – Dein digitales Rezeptbuch</title>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400;1,9..144,500&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
<style>
{css}
</style>
</head>
<body>
<div id="root"></div>
<script src="https://unpkg.com/react@18.3.1/umd/react.production.min.js"></script>
<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js"></script>
<script src="https://unpkg.com/@babel/standalone@7.24.7/babel.min.js"></script>
<script type="text/babel" data-presets="react">
{app_code}
</script>
</body>
</html>
"""

out = ROOT / "iCook-Vorschau.html"
out.write_text(html, encoding="utf-8")
print(f"Erstellt: {out}")
