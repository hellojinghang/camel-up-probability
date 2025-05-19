import pandas as pd
from itertools import permutations, product
from collections import defaultdict

# Updated camel movement logic with correct stack handling and oasis/mirage rules
def update_positions_v2(base_positions, moves, spectator_tiles):
    camels = list(base_positions.keys())
    stacks = {tile: [] for tile in range(17)}

    # Initialize stacks
    for camel in camels:
        tile, stack = base_positions[camel]
        stacks[tile].append((stack, camel))

    # Sort stacks by stack index (lowest = bottom)
    for tile in stacks:
        stacks[tile].sort()

    for camel, steps in moves:
        for tile, stack in stacks.items():
            for i, (_, c) in enumerate(stack):
                if c == camel:
                    if tile == 0:
                        # Tile 0: move only the camel itself
                        camel_stack = [(0, camel)]
                        stacks[tile] = [x for x in stack if x[1] != camel]
                    else:
                        # Move camel and all camels stacked on top
                        camel_stack = stack[i:]
                        stacks[tile] = stack[:i]

                    raw_dest_tile = tile + steps
                    final_dest_tile = raw_dest_tile

                    # Handle spectator tile (oasis or mirage)
                    if raw_dest_tile in spectator_tiles:
                        effect = spectator_tiles[raw_dest_tile]
                        if effect == "oasis":
                            final_dest_tile = min(16, raw_dest_tile + 1)
                            stacks[final_dest_tile].extend(camel_stack)
                        elif effect == "mirage":
                            final_dest_tile = max(0, raw_dest_tile - 1)
                            # Place moving camel at the bottom, rest on top, then existing stack
                            stacks[final_dest_tile] = (
                                [(0, camel_stack[0][1])] +
                                [(idx + 1, cam) for idx, (_, cam) in enumerate(camel_stack[1:])] +
                                stacks[final_dest_tile]
                            )
                        else:
                            stacks[final_dest_tile].extend(camel_stack)
                        break
                    else:
                        # Normal movement: place on top
                        stacks[raw_dest_tile].extend(camel_stack)
                    break
            else:
                continue
            break

    # Reconstruct final positions
    final_positions = {}
    for tile, stack in stacks.items():
        for idx, (_, camel) in enumerate(stack):
            final_positions[camel] = (tile, idx)

    return final_positions

# Rank camels by tile and stack index
def rank_camels(positions):
    return [camel for camel, _ in sorted(positions.items(), key=lambda x: (x[1][0], -x[1][1]), reverse=True)]

# Simulate all permutations of moves for remaining camels
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

# Summarize probabilities
def summarize_results(results):
    rank_counter = defaultdict(int)
    total = len(results)

    for rank in results:
        rank_counter[tuple(rank)] += 1

    df_rank = pd.DataFrame([
        {"Rank Order": " > ".join(r), "Probability (%)": c / total * 100}
        for r, c in sorted(rank_counter.items(), key=lambda x: -x[1])
    ])

    camel_rank_summary = defaultdict(lambda: [0] *
