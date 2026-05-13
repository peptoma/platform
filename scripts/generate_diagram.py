from PIL import Image, ImageDraw, ImageFont
import math, os

W, H = 2400, 980

BG     = (13, 15, 21)
PANEL  = (22, 27, 39)
BORD   = (44, 50, 66)
WHITE  = (228, 236, 255)
LGRAY  = (170, 180, 205)
GRAY   = (105, 115, 142)
DIM    = (52,  58,  76)

C_BLUE   = ( 82, 162, 255)
C_GREEN  = ( 45, 208, 140)
C_ORANGE = (246, 182,  34)
C_PURPLE = (158, 128, 252)
C_CYAN   = ( 85, 218, 244)
C_RED    = (242,  98,  98)
C_SILVER = (190, 200, 220)

def font(size, bold=False):
    for p in [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()

f11 = font(13)
f13 = font(15)
f13b= font(15, True)
f16b= font(18, True)
f20b= font(22, True)
f28b= font(30, True)
f36b= font(38, True)

img = Image.new("RGB", (W, H), BG)
d   = ImageDraw.Draw(img)

def ct(text, cx, cy, fnt, col):
    bb = d.textbbox((0,0), text, font=fnt)
    d.text((cx-(bb[2]-bb[0])//2, cy-(bb[3]-bb[1])//2), text, font=fnt, fill=col)

def rbox(x, y, w, h, fill=PANEL, outline=BORD, lw=2, r=10):
    d.rounded_rectangle([x,y,x+w,y+h], radius=r, fill=fill, outline=outline, width=lw)

def harrrow(x1, y1, x2, y2, col, lw=2):
    d.line([(x1,y1),(x2,y2)], fill=col, width=lw)
    a = math.atan2(y2-y1, x2-x1)
    s = 10
    d.polygon([(x2,y2),(x2-s*math.cos(a-0.4),y2-s*math.sin(a-0.4)),(x2-s*math.cos(a+0.4),y2-s*math.sin(a+0.4))], fill=col)

def step_arrow(x1, y1, x2, y2, col, lw=2):
    """Horizontal → vertical elbow, with arrowhead pointing right into target."""
    mid = (x1 + x2) // 2
    d.line([(x1, y1), (mid, y1)], fill=col, width=lw)
    d.line([(mid, y1), (mid, y2)], fill=col, width=lw)
    d.line([(mid, y2), (x2,  y2)], fill=col, width=lw)
    s = 9
    d.polygon([(x2, y2),(x2-s, y2-5),(x2-s, y2+5)], fill=col)

def dotted(x1, y1, x2, y2, col, lw=1, seg=6, gap=5):
    dx,dy = x2-x1, y2-y1
    L = math.hypot(dx,dy)
    if L<1: return
    ux,uy = dx/L, dy/L
    pos, on = 0.0, True
    while pos < L:
        nxt = min(pos+(seg if on else gap), L)
        if on: d.line([(x1+ux*pos,y1+uy*pos),(x1+ux*nxt,y1+uy*nxt)], fill=col, width=lw)
        pos, on = nxt, not on

# ── dot grid ─────────────────────────────────────────────────────────────────
for gx in range(0, W, 38):
    for gy in range(0, H, 38):
        d.ellipse([gx-1,gy-1,gx+1,gy+1], fill=(26,30,44))

# ── Title ────────────────────────────────────────────────────────────────────
ct("PEPTOMA  AI Copilot  —  Architecture & Flow", W//2, 46, f36b, WHITE)
ct("peptoma.xyz/copilot", W//2, 88, f13, GRAY)
d.line([(70,108),(W-70,108)], fill=BORD, width=1)

# ─────────────────────────────────────────────────────────────────────────────
# NODE SIZES
# ─────────────────────────────────────────────────────────────────────────────
UW,  UH  = 165,  76   # User
GW,  GH  = 225, 120   # API Gateway
NW4, NH4 = 265,  80   # each Agent box
EW,  EH  = 250, 190   # AI Engine
RPW, RPH = 225, 100   # Response

N_AGENTS  = 5
AGENT_GAP = 18
AGENT_TOTAL = N_AGENTS * NH4 + (N_AGENTS-1) * AGENT_GAP

MID   = 465
ATOP  = MID - AGENT_TOTAL // 2
ABOT  = ATOP + AGENT_TOTAL
RW    = 180
RH    = AGENT_TOTAL

# ── Column X positions (left edge of each node) ───────────────────────────────
# Gaps between columns: 100 px minimum
X1 = 70                            # User          ends at X1+UW
X2 = X1 + UW  + 110               # API Gateway   ends at X2+GW
X3 = X2 + GW  + 110               # Agent Router  ends at X3+RW
X4 = X3 + RW  + 110               # Agents        ends at X4+NW4
X5 = X4 + NW4 + 120               # AI Engine     ends at X5+EW
X6 = X5 + EW  + 120               # Response      ends at X6+RPW

# ─────────────────────────────────────────────────────────────────────────────
# 1. USER
# ─────────────────────────────────────────────────────────────────────────────
UY = MID - UH//2
rbox(X1, UY, UW, UH, outline=C_BLUE, r=10)
ct("User",       X1+UW//2, UY+26, f16b, C_BLUE)
ct("Chat Input", X1+UW//2, UY+52, f13,  GRAY)
ct("ENTRY",      X1+UW//2, UY-22, f11,  GRAY)

# ─────────────────────────────────────────────────────────────────────────────
# 2. API GATEWAY
# ─────────────────────────────────────────────────────────────────────────────
GY = MID - GH//2
rbox(X2, GY, GW, GH, fill=(18,23,36), outline=BORD, r=10)
ct("API Gateway",              X2+GW//2, GY+22,  f16b, C_SILVER)
d.line([(X2+16,GY+40),(X2+GW-16,GY+40)], fill=DIM, width=1)
ct("POST /api/copilot/chat",   X2+GW//2, GY+58,  f13,  GRAY)
ct("Express 5  |  Auth Check", X2+GW//2, GY+80,  f13,  GRAY)
ct("Rate Limit  |  Validation",X2+GW//2, GY+102, f13,  GRAY)

# Arrow 1 → 2  (horizontal, below both node labels)
harrrow(X1+UW, MID, X2, MID, C_BLUE, 2)
# label below the arrow line
ct("request", (X1+UW+X2)//2, MID+14, f11, GRAY)

# ─────────────────────────────────────────────────────────────────────────────
# 3. AGENT ROUTER
# ─────────────────────────────────────────────────────────────────────────────
rbox(X3, ATOP, RW, RH, fill=(18,23,36), outline=C_ORANGE, lw=2, r=10)
rcx = X3 + RW//2
ct("Agent",  rcx, ATOP + RH//2 - 22, f16b, C_ORANGE)
ct("Router", rcx, ATOP + RH//2 + 4,  f16b, C_ORANGE)
d.line([(X3+14, ATOP+RH//2+26),(X3+RW-14, ATOP+RH//2+26)], fill=(60,50,20), width=1)
ct("agentType",    rcx, ATOP + RH//2 + 44, f11, GRAY)
ct("system prompt",rcx, ATOP + RH//2 + 60, f11, GRAY)

# Arrow 2 → 3  (horizontal at MID)
harrrow(X2+GW, MID, X3, MID, C_ORANGE, 2)

# ─────────────────────────────────────────────────────────────────────────────
# 4. AGENTS
# ─────────────────────────────────────────────────────────────────────────────
agents = [
    ("Research Agent",   "Peptide profile and citations",  C_GREEN),
    ("Protocol Builder", "Goal to curated peptide stack",  C_BLUE),
    ("Compare Agent",    "Side-by-side comparison table",  C_PURPLE),
    ("Literature Agent", "Paper and abstract summary",     C_CYAN),
    ("Safety Agent",     "Risk and contraindications",     C_RED),
]

agent_ys = [ATOP + i*(NH4+AGENT_GAP) for i in range(N_AGENTS)]

for i, (name, sub, col) in enumerate(agents):
    ay  = agent_ys[i]
    acy = ay + NH4//2
    rbox(X4, ay, NW4, NH4, outline=col, r=10)
    ct(name, X4+NW4//2, ay+28, f13b, col)
    ct(sub,  X4+NW4//2, ay+56, f13,  GRAY)
    # Router right → agent left  (straight horizontal)
    harrrow(X3+RW, acy, X4, acy, col, 2)

# ─────────────────────────────────────────────────────────────────────────────
# 5. AI ENGINE
# ─────────────────────────────────────────────────────────────────────────────
EY = MID - EH//2
rbox(X5, EY, EW, EH, fill=(16,24,34), outline=C_GREEN, lw=3, r=14)
ecx = X5 + EW//2
ct("PEPTOMA", ecx, EY+28, f20b, C_GREEN)
ct("AI Engine",ecx, EY+54, f20b, C_GREEN)
d.line([(X5+20,EY+76),(X5+EW-20,EY+76)], fill=(28,68,48), width=1)
ct("System Prompt per Agent",    ecx, EY+98,  f13, GRAY)
ct("Chat History Context",       ecx, EY+120, f13, GRAY)
ct("Temp 0.3  |  Max 600 tokens",ecx, EY+144, f13, GRAY)
ct("Structured Output",          ecx, EY+166, f13, GRAY)

# Agents → Engine (step arrows, each colour)
for i, (name, sub, col) in enumerate(agents):
    ay  = agent_ys[i]
    acy = ay + NH4//2
    step_arrow(X4+NW4, acy, X5, MID, col, 2)

# ─────────────────────────────────────────────────────────────────────────────
# 6. RESPONSE
# ─────────────────────────────────────────────────────────────────────────────
RPY = MID - RPH//2
rbox(X6, RPY, RPW, RPH, outline=C_GREEN, r=10)
rcx2 = X6 + RPW//2
ct("Response",           rcx2, RPY+24, f16b, C_GREEN)
d.line([(X6+16,RPY+44),(X6+RPW-16,RPY+44)], fill=(28,68,48), width=1)
ct("Structured JSON reply", rcx2, RPY+62, f13, GRAY)
ct("SDK  |  MCP  |  REST",  rcx2, RPY+84, f13, GRAY)

harrrow(X5+EW, MID, X6, MID, C_GREEN, 2)
ct("JSON", (X5+EW+X6)//2, MID+14, f11, GRAY)

# ─────────────────────────────────────────────────────────────────────────────
# Section labels (above each column)
# ─────────────────────────────────────────────────────────────────────────────
TOP_LABEL_Y = 130
labels_top = [
    (X1+UW//2,   "INPUT"),
    (X2+GW//2,   "GATEWAY"),
    (X3+RW//2,   "ROUTER"),
    (X4+NW4//2,  "AGENTS"),
    (X5+EW//2,   "AI ENGINE"),
    (X6+RPW//2,  "OUTPUT"),
]
for lx, ltxt in labels_top:
    ct(ltxt, lx, TOP_LABEL_Y, f11, DIM)
    d.line([(lx-30, TOP_LABEL_Y+12),(lx+30, TOP_LABEL_Y+12)], fill=DIM, width=1)

# ─────────────────────────────────────────────────────────────────────────────
# ACCESS LAYERS
# ─────────────────────────────────────────────────────────────────────────────
BOT = 830
d.line([(70,BOT-26),(W-70,BOT-26)], fill=BORD, width=1)
ct("ACCESS  LAYERS", W//2, BOT-10, f11, GRAY)

LW2, LH2 = 240, 76
layers = [
    ("Web UI",     "peptoma.xyz/copilot", C_BLUE,   480),
    ("SDK",        "peptoma-sdk  v0.1.2", C_GREEN,  800),
    ("MCP Server", "peptoma-mcp  v0.1.6", C_PURPLE, 1120),
    ("REST API",   "/api/copilot/chat",   C_ORANGE, 1440),
]
for lname, lsub, lcol, lx in layers:
    rbox(lx-LW2//2, BOT+6, LW2, LH2, outline=lcol, r=10)
    ct(lname, lx, BOT+28, f13b, lcol)
    ct(lsub,  lx, BOT+56, f13,  GRAY)
    dotted(lx, BOT+4, rcx2, RPY+RPH, lcol, 1)

# ─────────────────────────────────────────────────────────────────────────────
# Footer
# ─────────────────────────────────────────────────────────────────────────────
d.line([(70,H-32),(W-70,H-32)], fill=BORD, width=1)
ct("peptoma.xyz   |   Open DeSci Platform   |   $PEPTM   |   Solana", W//2, H-14, f11, GRAY)

# Save
out = "attached_assets/peptoma_ai_copilot_architecture.jpg"
img.save(out, "JPEG", quality=96)
print(f"Saved  {W}x{H}  →  {out}")
