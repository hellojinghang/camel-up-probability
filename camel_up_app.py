import streamlit as st
import pandas as pd
from collections import defaultdict

camel_colors = ["Blue", "Red", "Yellow", "Green", "Orange"]

st.title("Camel Up Probability Calculator")

# Initial Positions
st.subheader("Initial Camel Positions")
initial_positions = {}
for camel in camel_colors:
    col1, col2 = st.columns(2)
    with col1:
        tile = st.number_input(f"{camel} Tile", min_value=0, max_value=16, value=0, key=f"{camel}_tile")
    with col2:
        stack = st.number_input(f"{camel} Stack Index", min_value=0, max_value=4, value=0, key=f"{camel}_stack")
    initial_positions[camel] = (tile, stack)

# Remaining Camels
remaining_camels = st.multiselect("Select Camels That Haven't Moved Yet", camel_colors)

# Spectator Tiles
st.subheader("Spectator Tiles")
oasis_tiles = st.multiselect("Oasis Tiles (Advance +1)", list(range(1, 17)), default=[])
mirage_tiles = st.multiselect("Mirage Tiles (Retreat -1, go under stack)", list(range(1, 17)), default=[]))

spectator_tiles = {}
for t in oasis_tiles:
    spectator_tiles[t] = "oasis"
for t in mirage_tiles:
    spectator_tiles[t] = "mirage"

# Dice Rolls
st.subheader("Simulated Dice Rolls")
dice_rolls = [1, 2, 3]


def update_positions_corrected(base_positions, moves, spectator_tiles):
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

                    dest_tile = tile + steps
                    mirage = False

                    if dest_tile in spectator_tiles:
                        effect = spectator_tiles[dest_tile]
                        if effect == "oasis":
                            dest_tile = min(16, dest_tile + 1)
                        elif effect == "mirage":
                            dest_tile = max(0, dest_tile - 1)
                            mirage = True

                    if mirage:
                        stacks[dest_tile] = camel_stack + stacks[dest_tile]
                    else:
                        stacks[dest_tile].extend(camel_stack)
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
    ranked = sorted(positions.items(), key=lambda x: (x[1][0], -x[1][1]), reverse=True)
    return [camel for camel, _ in ranked]


# Simulation
if st.button("Calculate Probabilities"):
    results = []
    for roll in dice_rolls:
        for camel in remaining_camels:
            moves = [(camel, roll)]
            updated_positions = update_positions_corrected(initial_positions, moves, spectator_tiles)
            ranking = rank_camels(updated_positions)
            results.append(tuple(ranking))

    rank_counter = defaultdict(int)
    camel_rank_tally = {camel: [0]*5 for camel in camel_colors}

    for rank in results:
        rank_counter[rank] += 1
        for i, camel in enumerate(rank):
            camel_rank_tally[camel][i] += 1

    total = len(results)

    df_rank_summary = pd.DataFrame({
        "Camel": camel_colors,
        "1st (%)": [camel_rank_tally[c][0] / total * 100 for c in camel_colors],
        "2nd (%)": [camel_rank_tally[c][1] / total * 100 for c in camel_colors],
        "3rd (%)": [camel_rank_tally[c][2] / total * 100 for c in camel_colors],
        "4th (%)": [camel_rank_tally[c][3] / total * 100 for c in camel_colors],
        "5th (%)": [camel_rank_tally[c][4] / total * 100 for c in camel_colors],
    })

    df_result_final = pd.DataFrame([
        {"Rank Order": rank, "Probability (%)": count / total * 100}
        for rank, count in sorted(rank_counter.items(), key=lambda x: -x[1])
    ])

    df_result_final.reset_index(drop=True, inplace=True)

    st.subheader("Probability by Full Rank Order")
    st.dataframe(df_result_final, use_container_width=True)

    st.subheader("Probability Summary by Camel Rank")
    st.dataframe(df_rank_summary, use_container_width=True)
