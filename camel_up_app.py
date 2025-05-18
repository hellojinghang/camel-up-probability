
import streamlit as st
import pandas as pd
import itertools

# === BACKEND FUNCTIONS ===

def generate_remaining_dice_permutations(remaining_camels):
    rolls = [1, 2, 3]
    all_rolls = list(itertools.product(rolls, repeat=len(remaining_camels)))
    all_orders = list(itertools.permutations(remaining_camels))
    results = []

    for order in all_orders:
        for roll_set in all_rolls:
            combo = list(zip(order, roll_set))
            results.append(combo)

    return results

def update_positions(base_positions, moves, spectator_tiles):
    camels = list(base_positions.keys())
    stacks = {tile: [] for tile in range(17)}
    for camel in camels:
        tile, stack = base_positions[camel]
        stacks[tile].append((stack, camel))

    for tile in stacks:
        stacks[tile].sort()

    for camel, steps in moves:
        for tile, stack in stacks.items():
            for s in stack:
                if s[1] == camel:
                    camel_stack = stack[stack.index(s):]
                    stacks[tile] = stack[:stack.index(s)]
                    dest_tile = tile + steps
                    if dest_tile > 16:
                        dest_tile = 16

                    if dest_tile in spectator_tiles:
                        effect = spectator_tiles[dest_tile]
                        if effect == "oasis":
                            dest_tile = min(16, dest_tile + 1)
                        elif effect == "mirage":
                            dest_tile = max(0, dest_tile - 1)

                    stacks[dest_tile].extend(camel_stack)
                    break
            else:
                continue
            break

    final_positions = {}
    for tile in stacks:
        for stack_idx, (_, camel) in enumerate(stacks[tile]):
            final_positions[camel] = (tile, stack_idx)

    return final_positions

def rank_camels(positions):
    return sorted(positions.items(), key=lambda x: (-x[1][0], -x[1][1]))

def apply_permutations_to_results(permutations, base_positions, spectator_tiles):
    records = []
    for perm in permutations:
        result = update_positions(base_positions, perm, spectator_tiles)
        ranks = rank_camels(result)
        record = {
            'combo': str(perm)
        }
        for camel in base_positions.keys():
            record[f"{camel}_tile"] = result[camel][0]
            record[f"{camel}_stack"] = result[camel][1]
        for i, (camel, _) in enumerate(ranks):
            record[f"rank_{i+1}"] = camel
        records.append(record)
    return pd.DataFrame(records)

def summarize_probabilities(df, camels):
    total = len(df)
    summary = {}
    for camel in camels:
        summary[camel] = {}
        for i in range(1, 6):
            summary[camel][f"{i}st"] = (df[f"rank_{i}"] == camel).sum() / total * 100
    return pd.DataFrame(summary).T

# === STREAMLIT UI ===

st.title("🐫 Camel Up Probability Calculator")

camels = ['Red', 'Blue', 'Green', 'Yellow', 'Orange']
base_positions = {}

st.subheader("Enter Camel Positions (Tile & Stack Index):")
for camel in camels:
    col1, col2 = st.columns(2)
    with col1:
        tile = st.number_input(f"{camel} Tile", 0, 16, 0, key=f"{camel}_tile")
    with col2:
        stack = st.number_input(f"{camel} Stack", 0, 4, 0, key=f"{camel}_stack")
    base_positions[camel] = (tile, stack)

remaining = st.multiselect("Select Camels That Have NOT Rolled Yet:", camels, default=camels)

st.subheader("Spectator Tiles (Optional)")
spectator_tiles = {}
for tile in range(17):
    effect = st.selectbox(f"Tile {tile}", ['None', 'oasis', 'mirage'], key=f"tile_{tile}")
    if effect != 'None':
        spectator_tiles[tile] = effect

if st.button("Calculate Probabilities"):
    st.info("Generating permutations and calculating outcomes...")
    permutations = generate_remaining_dice_permutations(remaining)
    df_result = apply_permutations_to_results(permutations, base_positions, spectator_tiles)
    df_summary = summarize_probabilities(df_result, camels)
    st.subheader("Probability Summary (%)")
    st.dataframe(df_summary.style.format("{:.2f}"))
