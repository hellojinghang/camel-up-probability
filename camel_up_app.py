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
    tile_occupied = set()
    for camel in camel_colors:
        col1, col2 = st.columns(2)
        with col1:
            tile = st.slider(f"{camel} Tile", 0, 16, 1, key=f"{camel}_tile")
        with col2:
            stack_pos = st.slider(f"{camel} Stack Position (0 = bottom)", 0, 4, 0, key=f"{camel}_stack")
        initial_positions[camel] = (tile, stack_pos)
        tile_occupied.add(tile)

    st.subheader("Remaining Camels to Roll")
    remaining_camels = st.multiselect("Select remaining camels to roll", camel_colors)

    st.subheader("Spectator Tiles")
    spectator_tiles = {}
    spectator_state = st.session_state.setdefault("spectator_tiles", {})

    with st.expander("Add Spectator Tile"):
        selected_tile = st.slider("Tile to place spectator tile", 0, 16, 3, key="selected_tile")
        effect = st.selectbox("Effect", ["oasis", "mirage"], key="effect")
        if st.form_submit_button("Add Spectator Tile"):
            if selected_tile in tile_occupied:
                st.error("❌ Cannot place spectator tile on a tile that already has a camel.")
            elif any(abs(selected_tile - t) == 1 for t in spectator_state):
                st.error("❌ Spectator tiles cannot be adjacent to one another.")
            else:
                spectator_state[selected_tile] = effect
                st.success(f"✅ Spectator tile added on tile {selected_tile} with effect '{effect}'.")

    # Show current spectator tiles and allow removal
    if spectator_state:
        st.markdown("**Current Spectator Tiles:**")
        for tile, eff in list(spectator_state.items()):
            col1, col2 = st.columns([4, 1])
            with col1:
                st.markdown(f"Tile {tile}: {eff}")
            with col2:
                if st.button("Remove", key=f"remove_{tile}"):
                    del spectator_state[tile]
                    st.experimental_rerun()

    simulate = st.form_submit_button("Run Simulation")

if simulate:
    try:
        results = simulate_combinations(initial_positions, remaining_camels, spectator_state)
        df_rank, df_summary = summarize_results(results)

        st.subheader("🔢 Rank Order Probabilities")
        st.dataframe(df_rank.head(10))

        st.subheader("📊 Per-Camel Rank Probabilities & Counts")
        st.dataframe(df_summary)

    except Exception as e:
        st.error(f"Error in simulation: {e}")
