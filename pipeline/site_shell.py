"""The site's shared shell: the head, the top bar, the footer and the phone
tab bar, one source for every page.

The static pages under site/ carry this markup as written; the story page is
generated with it (pipeline/build_story.py). pipeline/tests/test_site_shell.py
fails if any page drifts from it, so the navigation cannot fork between
pages. The 404 page is served at any depth, so it takes base="/".
"""

SITE = "https://versioncontrol.walker-robinson.com"
REPORT_URL = "https://github.com/wrobinson127/versioncontrol/issues/new"
SOURCE_URL = "https://github.com/wrobinson127/versioncontrol"

# (file, label in the top bar, label in the phone tab bar)
NAV = (
    ("overview.html", "Overview", "Overview"),
    ("story.html", "Story", "Story"),
    ("explorer.html", "Explorer", "Explorer"),
    ("methodology.html", "Methodology", "Method"),
    ("data.html", "Data", "Data"),
    ("about.html", "About", "About"),
)

FONTS = ("https://fonts.googleapis.com/css2?family=Martian+Mono:wdth,wght@87.5,400..600"
         "&family=Mona+Sans:wdth,wght@100..125,400..700&display=swap")

# Runs before paint: the theme (the reader's saved choice; with none, the
# system light or dark setting), the js class that reveals script-only
# controls, and the redirect that keeps old timeline links working
# (index.html#<entry-id> opens that entry). The home page also carries
# HOME_REDIRECT: an overview link shared before the overview moved to
# overview.html (/?labs=...&from=...) opens the overview with its filters.
BOOT = ('<script>(function(){var d=document.documentElement,t=null;try{t=localStorage.getItem("vc-theme");}catch(e){}'
        'if(t!=="light"&&t!=="dark"){t=window.matchMedia&&matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";}'
        'd.setAttribute("data-theme",t);d.className+=" js";})();</script>')
REDIRECT = ('<script>(function(){var h=location.hash.slice(1);try{h=decodeURIComponent(h);}catch(e){}'
            'if(/^[a-z0-9.-]+--[^\\s\\/?#]+$/i.test(h)){location.replace("explorer.html?id="+encodeURIComponent(h));}})();</script>')

HOME_REDIRECT = ('<script>(function(){var q=new URLSearchParams(location.search);'
                 'if(["from","to","labs","country","bench"].some(function(k){return q.has(k);})){'
                 'location.replace("overview.html"+location.search+location.hash);}})();</script>')

MARK = ('<svg class="mark" viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">'
        '<rect x="1" y="1" width="4" height="4" rx="1" class="m0"/><rect x="7" y="1" width="4" height="4" rx="1" class="m2"/>'
        '<rect x="13" y="1" width="4" height="4" rx="1" class="m0"/><rect x="1" y="7" width="4" height="4" rx="1" class="m1"/>'
        '<rect x="7" y="7" width="4" height="4" rx="1" class="m3"/><rect x="13" y="7" width="4" height="4" rx="1" class="m2"/>'
        '<rect x="1" y="13" width="4" height="4" rx="1" class="m0"/><rect x="7" y="13" width="4" height="4" rx="1" class="m1"/>'
        '<rect x="13" y="13" width="4" height="4" rx="1" class="m4"/></svg>')

# Tab bar glyphs: plain geometry on an 18-unit grid, one stroke weight.
GLYPHS = {
    "overview.html": '<rect x="2" y="2" width="6" height="6" rx="1"/><rect x="10" y="2" width="6" height="6" rx="1" class="f"/>'
                  '<rect x="2" y="10" width="6" height="6" rx="1" class="f"/><rect x="10" y="10" width="6" height="6" rx="1"/>',
    "story.html": '<rect x="2" y="10" width="3.5" height="6" rx="1"/><rect x="7.25" y="6" width="3.5" height="10" rx="1" class="f"/>'
                  '<rect x="12.5" y="2" width="3.5" height="14" rx="1"/>',
    "explorer.html": '<rect x="2" y="3" width="14" height="12" rx="1.5"/><path d="M2 7.5h14M2 11.5h14M6.5 3v12"/>',
    "methodology.html": '<rect x="3.5" y="2" width="11" height="14" rx="1.5"/><path d="M6.5 6h5M6.5 9h5M6.5 12h3"/>',
    "data.html": '<path d="M9 2.5v8.5M5.5 7.5L9 11l3.5-3.5"/><path d="M2.5 12v3.5h13V12"/>',
    "about.html": '<circle cx="9" cy="9" r="6.5"/><path d="M9 8.2v4.3M9 5.6v.1"/>',
    "search": '<circle cx="8" cy="8" r="5"/><path d="M11.8 11.8l4 4"/>',
}


def head(title: str, description: str, path: str, base: str = "", extra: str = "",
         og_type: str = "article", preload_data: bool = True, robots: str = "") -> str:
    """Everything in <head> after the charset: one shape for every page."""
    canonical = f"{SITE}/{'' if path == 'index.html' else path}"
    pre = ""
    if preload_data:
        pre = "".join(f'<link rel="preload" href="{base}data/{p}" as="fetch" crossorigin>\n' for p in (
            "manifest.json", "derived/views.json.gz", "derived/deltas.json.gz", "derived/site_meta.json"))
    meta = (f'<link rel="canonical" href="{canonical}">\n'
            f'<meta property="og:title" content="{title}">\n'
            f'<meta property="og:description" content="{description}">\n'
            f'<meta property="og:type" content="{og_type}">\n'
            f'<meta property="og:url" content="{canonical}">\n'
            f'<meta property="og:image" content="{SITE}/assets/og.png">\n'
            '<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">\n'
            '<meta name="twitter:card" content="summary_large_image">\n'
            f'<meta name="twitter:image" content="{SITE}/assets/og.png">\n') if not robots else f'<meta name="robots" content="{robots}">\n'
    return ('<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
            f"<title>{title}</title>\n"
            f'<meta name="description" content="{description}">\n'
            '<meta name="color-scheme" content="dark light">\n'
            + meta +
            BOOT + "\n"
            + extra +
            '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
            '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
            f'<link rel="stylesheet" href="{FONTS.replace("&", "&amp;")}">\n'
            f'<link rel="stylesheet" href="{base}css/site.css">\n'
            + pre +
            # Search engines want a square raster at a multiple of 48px
            # beside the SVG; favicon.ico at the root is the fallback.
            f'<link rel="icon" href="{base}favicon.ico" sizes="48x48">\n'
            f'<link rel="icon" href="{base}assets/favicon.svg" type="image/svg+xml">\n'
            f'<link rel="icon" href="{base}assets/favicon-192.png" type="image/png" sizes="192x192">\n'
            f'<link rel="apple-touch-icon" href="{base}assets/apple-touch-icon.png">\n')


def topbar(current: str, base: str = "") -> str:
    cur = ' aria-current="page"'
    links = "\n".join(
        f'    <a href="{base}{f}"{cur if f == current else ""}>{label}</a>'
        for f, label, _ in NAV)
    return (
        '<header class="topbar">\n'
        f'  <a class="brand" href="{base}index.html" aria-label="Version Control, home">{MARK}<span class="brand-name">Version Control</span></a>\n'
        '  <nav class="topnav" aria-label="Sections">\n'
        f"{links}\n"
        "  </nav>\n"
        '  <div class="topact">\n'
        '    <button type="button" class="search-btn" data-open-palette aria-label="Search models, labs and views (Ctrl K)"><span>Search models, labs, views</span><kbd><span class="kmod">Ctrl</span> K</kbd></button>\n'
        f'    <a class="btn btn-cmp" href="{base}overview.html?compare=openai,anthropic" data-open-compare aria-haspopup="dialog">Compare <kbd>c</kbd></a>\n'
        '    <button type="button" class="btn btn-theme" data-theme-toggle aria-pressed="false"><span class="sr">Theme: </span><span class="tt-word">Dark</span></button>\n'
        '    <button type="button" class="btn btn-icon btn-help" data-open-help aria-label="Keyboard shortcuts" aria-haspopup="dialog">?</button>\n'
        "  </div>\n"
        "</header>\n")


def footer(base: str = "") -> str:
    return (
        '<footer class="foot">\n'
        '  <div class="foot-in">\n'
        f'    <p class="foot-what"><b>Version Control.</b> Maintained by <a href="https://walker-robinson.com">Walker Robinson</a>. Dataset licensed CC-BY 4.0 with Epoch AI attribution.</p>\n'
        '    <nav class="foot-links" aria-label="Record">\n'
        f'      <a href="{base}about.html">About</a>\n'
        f'      <a href="{base}data.html">Download the dataset</a>\n'
        f'      <a href="{base}changes.html">Changes and corrections</a>\n'
        f'      <a href="{REPORT_URL}" rel="external">Report an error</a>\n'
        f'      <a href="{SOURCE_URL}" rel="external">Source on GitHub</a>\n'
        "    </nav>\n"
        '    <p class="foot-stamp" id="foot-update">Last successful update loads with the dataset.</p>\n'
        "  </div>\n"
        "</footer>\n")


def tabbar(current: str, base: str = "") -> str:
    items = []
    for f, _, short in NAV:
        cur = ' aria-current="page"' if f == current else ""
        items.append(f'  <a href="{base}{f}"{cur}><svg class="tb-g" viewBox="0 0 18 18" aria-hidden="true">{GLYPHS[f]}</svg>{short}</a>')
    items.append(f'  <button type="button" data-open-palette><svg class="tb-g" viewBox="0 0 18 18" aria-hidden="true">{GLYPHS["search"]}</svg>Search</button>')
    return '<nav class="tabbar" aria-label="Sections, phone">\n' + "\n".join(items) + "\n</nav>\n"


def page(path: str, title: str, description: str, body_class: str, main: str, scripts: tuple,
         base: str = "", extra_head: str = "", og_type: str = "article", robots: str = "",
         skip: str = "Skip to the content") -> str:
    """A whole page in the shared shell."""
    return ("<!DOCTYPE html>\n"
            '<html lang="en" data-theme="dark">\n<head>\n'
            + head(title, description, path, base, extra_head, og_type, robots=robots)
            + "</head>\n"
            f'<body class="{body_class}">\n'
            f'<a class="skip" href="#main">{skip}</a>\n'
            + topbar(path, base) + main + footer(base) + tabbar(path, base)
            + "".join(f'<script src="{base}js/{s}"></script>\n' for s in scripts)
            + "</body>\n</html>\n")
