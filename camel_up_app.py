import streamlit as st
import pandas as pd
from itertools import permutations, product
from collections import defaultdict

# Fixed camel movement logic with proper stacking

def update_positions(base_positions, moves, spectator_tiles):
    camels = list(base_positions.keys())
    stacks = {tile: [] for tile in range(17)}

    # Initialize stacks
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
                            stacks[final_dest_tile] = camel_stack + stacks[final_dest_tile]
                        elif effect == "mirage":
                            final_dest_tile = max(0, raw_dest_tile - 1)
                            stacks[final_dest_tile] = (
                                [(0, camel_stack[0][1])] +
                                [(idx + 1, cam) for idx, (_, cam) in enumerate(camel_stack[1:])] +
                                stacks[final_dest_tile]
                            )
                        else:
                            stacks[final_dest_tile] = camel_stack + stacks[final_dest_tile]
                        break
                    else:
                        stacks[raw_dest_tile] = camel_stack + stacks[raw_dest_tile]
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
            final_pos = update_positions(initial_positions, moves, spectator_tiles)
            rank = rank_camels(final_pos)
            results.append(rank)
    return results


def summarize_results(results):
    rank_counter = defaultdict(int)
    total = len(results)

    for rank in results:
        rank_counter[tuple(rank)] += 1

    df_rank = pd.DataFrame([
        {
            "Rank Order": " > ".join(r),
            "Count": c,
            "Probability (%)": c / total * 100
        }
        for r, c in sorted(rank_counter.items(), key=lambda x: -x[1])
    ])

    camel_rank_summary = defaultdict(lambda: [0] * 5)
    for rank in results:
        for i, camel in enumerate(rank):
            camel_rank_summary[camel][i] += 1

    df_camel_summary = pd.DataFrame([
        {
            "Camel": camel,
            **{f"{i+1}st": count / total * 100 for i, count in enumerate(ranks)},
            **{f"{i+1}st Count": count for i, count in enumerate(ranks)}
        }
        for camel, ranks in camel_rank_summary.items()
    ])
    return df_rank, df_camel_summary.sort_values("1st", ascending=False)


# Streamlit UI
st.title("🐫 Camel Up: Probability Simulator")

st.markdown("""
Configure camel positions and spectator tiles below. Results show probability and count of each outcome.
""")

camel_colors = ["Red", "Blue", "Yellow", "Orange", "Green"]

with st.form("input_form"):
    st.subheader("Camel Positions")
    initial_positions = {}
    all_positions = set()
    for camel in camel_colors:
        col1, col2 = st.columns(2)
        with col1:
            tile = st.slider(f"{camel} Tile", 0, 16, 1, key=f"{camel}_tile")
        with col2:
            stack_pos = st.slider(f"{camel} Stack Position (0 = bottom)", 0, 4, 0, key=f"{camel}_stack")

        if (tile, stack_pos) in all_positions:
            st.error(f"Invalid: Multiple camels on tile {tile} stack {stack_pos}")
        all_positions.add((tile, stack_pos))
        initial_positions[camel] = (tile, stack_pos)

    st.subheader("Remaining Camels to Roll")
    remaining_camels = st.multiselect("Select remaining camels to roll", camel_colors)

    st.subheader("Spectator Tiles")
    spectator_tiles = {}
    selected_tiles = st.multiselect("Select tile(s) for spectator effect", list(range(17)), key="spectator_tiles")

    valid_spectator_tiles = []
    for tile in selected_tiles:
        if any((abs(tile - other) == 1) for other in valid_spectator_tiles):
            st.error(f"Invalid: Spectator tile at {tile} adjacent to another spectator tile.")
            continue
        if tile in [pos[0] for pos in initial_positions.values()]:
            st.error(f"Invalid: Spectator tile at {tile} overlaps with camel.")
            continue
        effect = st.selectbox(
            f"Effect for tile {tile}", ["oasis", "mirage"], key=f"spectator_effect_{tile}"
        )
        spectator_tiles[tile] = effect
        valid_spectator_tiles.append(tile)

    simulate = st.form_submit_button("Run Simulation")

if simulate:
    if len(all_positions) < len(camel_colors):
        st.error("Invalid configuration: Duplicate camel positions detected. Fix before running.")
    else:
        try:
            results = simulate_combinations(initial_positions, remaining_camels, spectator_tiles)
            df_rank, df_summary = summarize_results(results)

            st.subheader("🔢 Rank Order Probabilities")
            st.dataframe(df_rank.head(10))

            st.subheader("📊 Per-Camel Rank Probabilities & Counts")
            st.dataframe(df_summary)

        except Exception as e:
            st.error(f"Error in simulation: {e}")
