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
Enter initial positions, remaining camels to roll, and spectator tiles. The app will simulate all possible move outcomes
and display probabilities for each rank.
""")

with st.form("input_form"):
    pos_input = st.text_area("Initial Positions (e.g., Red:1,1; Blue:1,0; Green:7,0)",
                              "Red:1,1; Blue:1,0; Yellow:5,0; Orange:6,0; Green:7,0")
    rem_camels = st.text_input("Remaining Camels to Roll (comma separated)", "Red,Blue")
    tile_input = st.text_input("Spectator Tiles (e.g., 3:oasis; 6:mirage)", "3:oasis")
    submitted = st.form_submit_button("Run Simulation")

if submitted:
    try:
        initial_positions = {
            part.split(":")[0].strip(): (int(part.split(":")[1].split(",")[0]), int(part.split(",")[1]))
            for part in pos_input.split(";")
        }
        remaining_camels = [c.strip() for c in rem_camels.split(",") if c.strip()]
        spectator_tiles = {
            int(t.split(":"[0])): t.split(":")[1] for t in tile_input.split(";") if ":" in t
        }

        results = simulate_combinations(initial_positions, remaining_camels, spectator_tiles)
        df_rank, df_summary = summarize_results(results)

        st.subheader("🔢 Rank Order Probabilities")
        st.dataframe(df_rank.head(10))

        st.subheader("📊 Per-Camel Rank Probabilities & Counts")
        st.dataframe(df_summary)

    except Exception as e:
        st.error(f"Error in input: {e}")
