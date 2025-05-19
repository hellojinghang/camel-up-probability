import pandas as pd
from collections import defaultdict
import streamlit as st
from itertools import product, permutations

# Streamlit UI
st.title("🐫 Camel Up Probability Calculator")

st.markdown("Enter the current game state below:")

# Input: Initial camel positions
camel_colors = ["Blue", "Red", "Yellow", "Green", "Orange"]
initial_positions = {}

st.subheader("Initial Camel Positions")
for camel in camel_colors:
    col1, col2 = st.columns(2)
    with col1:
        tile = st.number_input(f"{camel} - Tile", min_value=0, max_value=16, value=0, key=f"{camel}_tile")
    with col2:
        index = st.number_input(f"{camel} - Stack Index", min_value=0, max_value=4, value=0, key=f"{camel}_index")
    initial_positions[camel] = (tile, index)

# Remaining camels to roll
remaining_camels = st.multiselect("Camels that have not rolled yet", options=camel_colors, default=camel_colors)

# Spectator tiles
st.subheader("Spectator Effects")
oasis_tiles = st.multiselect("Oasis Tiles (+1 forward)", options=list(range(1, 17)))
mirage_tiles = st.multiselect("Mirage Tiles (-1 backward)", options=list(range(1, 17)))
spectator_tiles = {tile: "oasis" for tile in oasis_tiles}
spectator_tiles.update({tile: "mirage" for tile in mirage_tiles})


def update_positions_corrected(base_positions, moves, spectator_tiles):
    camels = list(base_positions.keys())
    stacks = {tile: [] for tile in range(17)}

    # Initialize stacks
    for camel in camels:
        tile, stack = base_positions[camel]
        stacks[tile].append((stack, camel))

    for tile in stacks:
        stacks[tile].sort()  # stack order

    for camel, steps in moves:
        # Locate the camel in the stacks
        for tile, stack in stacks.items():
            for i, (_, c) in enumerate(stack):
                if c == camel:
                    # If on tile 0, move only this camel (not stacked ones)
                    if tile == 0:
                        camel_stack = [(0, camel)]
                        stacks[tile] = [x for x in stack if x[1] != camel]
                    else:
                        camel_stack = stack[i:]
                        stacks[tile] = stack[:i]

                    raw_dest_tile = tile + steps
                    final_dest_tile = raw_dest_tile
                    mirage = False
                    oasis = False

                    # Apply oasis/mirage logic
                    if raw_dest_tile in spectator_tiles:
                        effect = spectator_tiles[raw_dest_tile]
                        if effect == "oasis":
                            final_dest_tile = min(16, raw_dest_tile + 1)
                            oasis = True
                        elif effect == "mirage":
                            final_dest_tile = max(0, raw_dest_tile - 1)
                            mirage = True

                    # Apply stack merge rules
                    if mirage:
                        stacks[final_dest_tile] = camel_stack + stacks[final_dest_tile]
                    elif oasis:
                        stacks[final_dest_tile].extend(camel_stack)
                    else:
                        stacks[raw_dest_tile].extend(camel_stack)

                    break
            else:
                continue
            break

    # Final positions
    final_positions = {}
    for tile, stack in stacks.items():
        for idx, (_, camel) in enumerate(stack):
            final_positions[camel] = (tile, idx)

    return final_positions


def rank_camels(positions):
    ranked = sorted(positions.items(), key=lambda x: (x[1][0], -x[1][1]), reverse=True)
    return [camel for camel, _ in ranked]


def simulate_all_rolls(initial_positions, remaining_camels, spectator_tiles):
    dice_faces = [1, 2, 3]
    all_roll_combos = list(product(dice_faces, repeat=len(remaining_camels)))
    all_orders = list(permutations(remaining_camels))

    results = []
    for rolls in all_roll_combos:
        for order in all_orders:
            moves = list(zip(order, rolls))
            final_positions = update_positions_corrected(initial_positions, moves, spectator_tiles)
            rank = rank_camels(final_positions)
            results.append(tuple(rank))

    return results


# Run simulation and show results
if st.button("Calculate Probabilities"):
    if not remaining_camels:
        st.warning("Please select at least one remaining camel.")
    else:
        results = simulate_all_rolls(initial_positions, remaining_camels, spectator_tiles)

        # Full ranking summary
        rank_counter = defaultdict(int)
        for rank in results:
            rank_counter[rank] += 1

        total = len(results)
        df_full_rank = pd.DataFrame([
            {"Rank Order": " > ".join(rank), "Probability (%)": count / total * 100}
            for rank, count in sorted(rank_counter.items(), key=lambda x: -x[1])
        ])
        df_full_rank.reset_index(drop=True, inplace=True)
        st.subheader("📊 Probability by Full Rank Order")
        st.dataframe(df_full_rank.style.format({"Probability (%)": "{:.2f}"}))

        # Per-camel rank summary
        camel_rank_summary = defaultdict(lambda: [0] * 5)
        for rank in results:
            for i, camel in enumerate(rank):
                camel_rank_summary[camel][i] += 1

        df_camel_summary = pd.DataFrame([
            {"Camel": camel, **{f"{i+1}st": count / total * 100 for i, count in enumerate(ranks)}}
            for camel, ranks in camel_rank_summary.items()
        ])
        df_camel_summary = df_camel_summary[["Camel", "1st", "2st", "3st", "4st", "5st"]]
        st.subheader("🐪 Per-Camel Finish Probability")
        st.dataframe(df_camel_summary.style.format({col: "{:.2f}%" for col in df_camel_summary.columns if col != "Camel"}))
