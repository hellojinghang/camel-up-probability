# app.py
import streamlit as st
import pandas as pd
from itertools import permutations, product
from collections import defaultdict

# -------------------- Core Game Logic --------------------

def update_positions_v2(base_positions, moves, spectator_tiles):
    camels = list(base_positions.keys())
    stacks = {tile: [] for tile in range(17)}

    for camel in camels:
        tile, stack = base_positions[camel]
        stacks[tile].append((stack, camel))

    for tile in stacks:
        stacks[tile].sort()

    for camel, steps in moves:
        for tile, stack in stacks.items():
            for i, (_, c) in enumerate(stack):
                if c == camel:
                    if tile == 0:
                        camel_stack = [(0, camel)]
                        stacks[tile] = [x for x in stack if x[1] != camel]
                    else:
                        camel_stack = stack[i:]
                        stacks[tile] = stack[:i]

                    raw_dest_tile = tile + steps
                    final_dest_tile = raw_dest_tile

                    if raw_dest_tile in spectator_tiles:
                        effect = spectator_tiles[raw_dest_tile]
                        if effect == "oasis":
                            final_dest_tile = min(16, raw_dest_tile + 1)
                            stacks[final_dest_tile].extend(camel_stack)
                        elif effect == "mirage":
                            final_dest_tile = max(0, raw_dest_tile - 1)
                            stacks[final_dest_tile] = (
                                [(0, camel_stack[0][1])] +
                                [(idx + 1, cam) for idx, (_, cam) in enumerate(camel_stack[1:])] +
                                stacks[final_dest_tile]
                            )
                        else:
                            stacks[final_dest_tile].extend(camel_stack)
                        break
                    else:
                        stacks[raw_dest_tile].extend(camel_stack)
                    break
            else:
                continue
            break

    final_positions = {}
    for tile, stack in stacks.items():
        for idx, (_, camel) in enumerate(stack):
            final_positions[camel] = (tile, idx)

    return final_positions

def rank_camels(positions):
    return [camel for camel, _ in sorted(positions.items(), key=lambda x: (x[1][0], -x[1][1]), reverse=True)]

def simulate_combinations(initial_positions, remaining_camels, spectator_tiles):
    dice_faces = [1, 2, 3]
    roll_combos = list(product(dice_faces, repeat=len(remaining_camels)))
    order_perms = list(permutations(remaining_camels))
    results = []

    for rolls in roll_combos:
        for order in order_perms:
            moves = list(zip(order, rolls))
            final_pos = update_positions_v2(initial_positions, moves, spectator_tiles)
            rank = rank_camels(final_pos)
            results.append(rank)
    return results

def summarize_results(results):
    rank_counter = defaultdict(int)
    total = len(results)

    for rank in results:
        rank_counter[tuple(rank)] += 1

    df_rank = pd.DataFrame([
        {"Rank Order": " > ".join(r), "Probability (%)": c / total * 100}
        for r, c in sorted(rank_counter.items(), key=lambda x: -x[1])
    ])

    camel_rank_summary = defaultdict(lambda: [0] * 5)
    for rank in results:
        for i, camel in enumerate(rank):
            camel_rank_summary[camel][i] += 1

    df_camel_summary = pd.DataFrame([
        {"Camel": camel, **{f"{i+1}st": count / total * 100 for i, count in enumerate(ranks)}}
        for camel, ranks in camel_rank_summary.items()
    ])

    return df_rank, df_camel_summary.sort_values("1st", ascending=False)

# -------------------- Streamlit UI --------------------

st.title("🐫 Camel Up Simulator")

with st.expander("📥 Input Camel Positions"):
    st.markdown("Enter camel tile (0-16) and stack index (0 = bottom):")
    camels = ["Red", "Blue", "Yellow", "Orange", "Green"]
    initial_positions = {}
    for camel in camels:
        col1, col2 = st.columns(2)
        with col1:
            tile = st.number_input(f"{camel} Tile", 0, 16, value=1 if camel in ["Red", "Blue"] else 5 + camels.index(camel))
        with col2:
            idx = st.number_input(f"{camel} Stack Position", 0, 4, value=0)
        initial_positions[camel] = (tile, idx)

remaining_camels = st.multiselect("🎲 Select Remaining Camels to Roll", camels, default=["Red", "Blue"])

with st.expander("🏜️ Add Spectator Tiles"):
    spectator_tiles = {}
    for i in range(17):
        effect = st.selectbox(f"Tile {i} Effect", ["none", "oasis", "mirage"], key=f"tile_{i}")
        if effect != "none":
            spectator_tiles[i] = effect

if st.button("Simulate"):
    if not remaining_camels:
        st.warning("Please select at least one camel to roll.")
    else:
        with st.spinner("Simulating..."):
            results = simulate_combinations(initial_positions, remaining_camels, spectator_tiles)
            df_rank, df_camel_summary = summarize_results(results)

        st.subheader("🔢 Rank Order Probabilities")
        st.dataframe(df_rank.head(10))

        st.subheader("📊 Per-Camel Rank Probabilities")
        st.dataframe(df_camel_summary)

        csv = df_camel_summary.to_csv(index=False).encode()
        st.download_button("⬇️ Download Camel Summary CSV", csv, "camel_summary.csv", "text/csv")

