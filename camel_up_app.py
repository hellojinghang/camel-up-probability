import streamlit as st
import pandas as pd
import random
import matplotlib.pyplot as plt

# --- Camel Colors ---
CAMELS = ["Red", "Blue", "Yellow", "Orange", "Green"]
TILES = list(range(1, 17))  # 1–16


# --- Session State Init ---
if "positions" not in st.session_state:
    st.session_state.positions = {c: None for c in CAMELS}  # (tile, stack)
if "spectators" not in st.session_state:
    st.session_state.spectators = {t: None for t in TILES}
if "remaining" not in st.session_state:
    st.session_state.remaining = CAMELS.copy()


# --- Helper Functions ---
def draw_board(positions, spectators):
    fig, ax = plt.subplots(figsize=(12, 2))
    ax.set_xlim(0.5, 16.5)
    ax.set_ylim(0, 4)
    ax.axis("off")

    # Draw tiles
    for t in TILES:
        ax.add_patch(
            plt.Rectangle((t - 0.5, 0), 1, 1, edgecolor="black", facecolor="white")
        )
        ax.text(t, -0.3, str(t), ha="center", fontsize=8)

    # Draw spectators
    for t, spec in spectators.items():
        if spec == "Oasis":
            ax.text(t, 0.5, "🌴", ha="center", va="center", fontsize=14)
        elif spec == "Mirage":
            ax.text(t, 0.5, "💫", ha="center", va="center", fontsize=14)

    # Draw camels
    stack_map = {}
    for camel, pos in positions.items():
        if pos:
            tile, stack = pos
            stack_map.setdefault(tile, []).append((stack, camel))

    for tile, stack_list in stack_map.items():
        stack_list.sort()  # lower stack index at bottom
        for idx, (_, camel) in enumerate(stack_list):
            ax.text(
                tile,
                1 + idx * 0.4,
                camel[0],
                ha="center",
                va="bottom",
                fontsize=12,
                fontweight="bold",
                color=camel.lower(),
            )

    st.pyplot(fig)


def validate_constraints(positions, spectators):
    # No camel overlap (same tile & stack index)
    seen = set()
    for c, pos in positions.items():
        if pos:
            if pos in seen:
                return False, f"Invalid: {c} shares same tile & stack with another camel."
            seen.add(pos)

    # Spectator tile cannot be on same tile as camel
    camel_tiles = {pos[0] for pos in positions.values() if pos}
    for t, spec in spectators.items():
        if spec and t in camel_tiles:
            return False, f"Invalid: Spectator on tile {t} where camel exists."

    # Spectator tiles cannot be adjacent
    active = [t for t, spec in spectators.items() if spec]
    for t in active:
        if t - 1 in active or t + 1 in active:
            return False, f"Invalid: Spectator tiles adjacent at {t}."
    return True, "OK"


# --- Game Logic ---
def update_positions(positions, spectators, camel, roll):
    """Move camel by dice roll and update stacking rules"""
    tile, stack = positions[camel]
    # collect stack of camels above
    stack_group = [c for c, p in positions.items() if p and p[0] == tile and p[1] >= stack]
    stack_group.sort(key=lambda c: positions[c][1])

    new_tile = tile + roll
    if new_tile > max(TILES):
        new_tile = max(TILES)

    # spectator tile effect
    if spectators.get(new_tile) == "Oasis":
        new_tile += 1
    elif spectators.get(new_tile) == "Mirage":
        new_tile -= 1

    # determine new stack index
    max_stack = max([p[1] for c, p in positions.items() if p and p[0] == new_tile] + [-1])
    new_stack = max_stack + 1

    # move stack group together
    for idx, c in enumerate(stack_group):
        positions[c] = (new_tile, new_stack + idx)
    return positions


def rank_camels(positions):
    """Rank camels by furthest tile, then by stack (higher = ahead)"""
    ranking = sorted(
        positions.items(), key=lambda x: (x[1][0], x[1][1]), reverse=True
    )
    return [c for c, _ in ranking]


def simulate_combinations(positions, spectators, remaining, trials=2000):
    results = []
    for _ in range(trials):
        pos_copy = positions.copy()
        spec_copy = spectators.copy()
        rem_copy = remaining.copy()
        random.shuffle(rem_copy)

        for camel in rem_copy:
            roll = random.randint(1, 3)
            pos_copy = update_positions(pos_copy, spec_copy, camel, roll)

        results.append(rank_camels(pos_copy))
    return results


def summarize_results(results):
    df = pd.DataFrame(results)
    counts = {c: {i + 1: 0 for i in range(len(CAMELS))} for c in CAMELS}
    for _, row in df.iterrows():
        for rank, camel in enumerate(row, start=1):
            counts[camel][rank] += 1

    summary = []
    total = len(results)
    for camel, ranks in counts.items():
        for rank, count in ranks.items():
            summary.append(
                {
                    "Camel": camel,
                    "Rank": rank,
                    "Count": count,
                    "Probability (%)": round(count / total * 100, 2),
                }
            )
    return pd.DataFrame(summary)


# --- UI Layout ---
st.title("🐪 Camel Up Simulator (Board-Driven UI)")

col1, col2 = st.columns([1, 2])

with col1:
    st.subheader("Setup")

    # Camel placement
    camel = st.selectbox("Select camel to place", CAMELS)
    tile = st.selectbox("Select tile", TILES)
    stack = st.number_input("Stack index (0=bottom)", min_value=0, max_value=4, value=0)

    if st.button("Place Camel"):
        st.session_state.positions[camel] = (tile, stack)

    # Spectator placement
    spec_tile = st.selectbox("Select tile for spectator", TILES)
    spec_type = st.radio("Spectator Type", ["None", "Oasis", "Mirage"], horizontal=True)
    if st.button("Place Spectator"):
        st.session_state.spectators[spec_tile] = (
            None if spec_type == "None" else spec_type
        )

    # Remaining camels
    st.session_state.remaining = st.multiselect(
        "Remaining camels to roll", CAMELS, default=st.session_state.remaining
    )

with col2:
    st.subheader("Board Preview")
    draw_board(st.session_state.positions, st.session_state.spectators)

# --- Validate & Simulate ---
valid, msg = validate_constraints(
    st.session_state.positions, st.session_state.spectators
)
if not valid:
    st.error(msg)
else:
    st.success("Setup valid. Ready to simulate!")

    if st.button("Run Simulation"):
        results = simulate_combinations(
            st.session_state.positions.copy(),
            st.session_state.spectators.copy(),
            st.session_state.remaining.copy(),
            trials=2000,
        )
        summary_df = summarize_results(results)
        st.dataframe(summary_df)
