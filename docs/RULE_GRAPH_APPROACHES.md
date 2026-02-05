# Bidding System Data Structure Approaches

A decision guide for representing bridge bidding system rules as a queryable structure.

## Requirements

| Requirement | Description |
|-------------|-------------|
| **Fast lookup** | Given auction sequence + context → meaning in O(1) or O(log n) |
| **Deterministic** | Same input always produces same answer |
| **Explainable** | Every answer traces back to its source in the original system doc |

## Context

- **Backend:** Supabase (PostgreSQL)
- **Frontend:** React + TypeScript
- **Integration:** Links to workspace elements in existing app
- **Input:** Text-based system documentation (not raw PDF)

---

## Approach 1: Priority-Indexed Rule Database

**What it is:** Flat table of rules, each with an auction pattern, context filters, meaning, and a priority integer for conflict resolution.

```
Rule: {
  auction_sequence: ["1S", "P", "2C"]
  context: { seat: "responder", vuln: "any" }
  meaning: "New minor forcing, 10-12 HCP"
  priority: 100
  source: "system_doc:line_42"
}
```

Lookup: Query rules matching the auction prefix + context, return highest priority match.

### Pros

- **Simple mental model:** Each rule is independent, priority resolves conflicts
- **Fast:** PostgreSQL GIN index on array enables O(1) prefix matching
- **Deterministic:** Priority integer removes ambiguity
- **Explainable:** Direct link to source line/section
- **Native to Supabase:** No additional infrastructure
- **Flexible context:** JSONB field handles seat, vulnerability, competitive without schema changes

### Cons

- **Redundancy:** Related bids stored as separate rules (no inheritance)
- **Priority calibration:** Must carefully assign priorities for "unless" clauses
- **No structure:** Loses visual hierarchy of parent/child bids

### Fit for Context

Excellent. Maps directly to Postgres, integrates with existing Supabase migration, source_ref can link to workspace elements.

---

## Approach 2: Graph Decision Tree

**What it is:** Directed graph where nodes represent auction states and edges represent bids. Traversing from root follows the auction.

```
(Root) --[1C]--> (State: "Strong club")
                   --[1D]--> (State: "0-7 HCP negative")
                   --[1H]--> (State: "8+ HCP, 5+ hearts")
```

Lookup: Start at root, follow edges matching the auction sequence, return the final node's meaning.

### Pros

- **Visual intuition:** Mirrors how bridge players think about auctions
- **Compact:** Child bids inherit parent context implicitly
- **Explainable:** Path from root = explanation
- **Fast traversal:** O(depth) where depth = auction length

### Cons

- **Combinatorial explosion:** Competitive auctions (opponent bids) multiply branches
- **Context duplication:** Different vulnerabilities require duplicate subtrees OR edge properties
- **Infrastructure:** Ideally needs graph DB (Neo4j, TigerGraph) for efficient traversal
- **Awkward in Postgres:** Can model with adjacency list, but loses graph query benefits
- **Updates are complex:** Adding a rule mid-tree requires restructuring

### Fit for Context

Moderate. Good for visualization layer, awkward as primary storage in Supabase. Could work as a derived view computed from flat rules.

---

## Approach 3: Hierarchical Text (BML-style)

**What it is:** Indentation-based text format where child bids are nested under parent bids.

```
1C  Strong, 16+ HCP
    1D  Negative, 0-7 HCP
        1H  Relay
    1H  Positive, 8+ HCP, 5+ hearts
    1N  8-11 balanced
```

Lookup: Parse into tree structure, traverse by auction sequence.

### Pros

- **Human-readable:** Editable in any text editor
- **Intuitive authoring:** Indentation = hierarchy
- **Established format:** BML used by BBO Full Disclosure community
- **Good for import/export:** Share systems as text files

### Cons

- **No query engine:** Must convert to another structure for lookups
- **Context handling:** Vulnerability/seat require directive commands that break flow
- **No conflict resolution:** First definition wins, no explicit priority
- **Loses structure on parse:** Flattens to rules anyway for querying

### Fit for Context

Good as **interchange format** (import/export), not as primary storage. Parse BML → flat rules for querying.

---

## Approach 4: Knowledge Graph with Ontology

**What it is:** RDF triples with formal ontology defining bid types, relationships, constraints. Query via SPARQL.

```turtle
:bid_1S_P_2C a :BiddingSequence ;
    :hasMeaning "New minor forcing" ;
    :requires [ :minHCP 10 ] ;
    :isForcing true ;
    :followsFrom :bid_1S_P .
```

Lookup: SPARQL query matching sequence pattern and constraints.

### Pros

- **Semantic precision:** Formal ontology enforces well-formed rules
- **Inference:** Can derive implicit rules (e.g., "forcing" implies partner must bid)
- **Standards-based:** RDF/OWL/SPARQL are W3C standards

### Cons

- **Overkill:** Bridge bidding doesn't need OWL reasoning
- **Performance:** SPARQL slower than indexed lookups for simple queries
- **Infrastructure:** Requires triple store (Virtuoso, GraphDB, etc.)
- **Steep learning curve:** RDF/SPARQL unfamiliar to most developers
- **Impedance mismatch:** Doesn't integrate naturally with Supabase/Postgres

### Fit for Context

Poor. Academic elegance without practical benefit for this use case.

---

## Approach 5: Neural Embeddings

**What it is:** Encode auction sequences and hand features as vectors. Nearest-neighbor lookup or classification model predicts meaning.

```
Input:  embed([1S, P, 2C]) + embed(hand_features)
Output: probability_distribution(meanings)
```

### Pros

- **Handles ambiguity:** Probabilistic output for unclear cases
- **Learns patterns:** No manual rule encoding
- **Scales:** Works for any system if trained on examples

### Cons

- **Not deterministic:** Same input may give different outputs
- **Not explainable:** Black box (cannot trace to source)
- **Wrong paradigm:** Goal is to encode YOUR rules, not learn crowd patterns
- **Training data:** Requires thousands of labeled examples per system
- **Overkill infrastructure:** Needs embedding model, vector DB

### Fit for Context

Poor. Violates core requirements (deterministic, explainable). Could augment for "what would most players bid?" but not for rule documentation.

---

## Summary Comparison

| Approach | Fast | Deterministic | Explainable | Supabase Fit | Recommended |
|----------|------|---------------|-------------|--------------|-------------|
| Priority-Indexed Rules | Yes | Yes | Yes | Excellent | **Primary storage** |
| Graph Decision Tree | Yes | Yes | Yes | Moderate | Visualization layer |
| Hierarchical Text (BML) | No* | Yes | Yes | N/A | Import/export format |
| Knowledge Graph | Moderate | Yes | Yes | Poor | Not recommended |
| Neural Embeddings | Yes | No | No | Poor | Not recommended |

*Requires conversion to queryable structure

---

## Recommendation

**Primary storage:** Priority-Indexed Rule Database in Supabase

**Import/export:** BML-compatible text format for sharing

**Visualization (future):** Derive graph view from flat rules for UI display

---

## Open Questions

1. **Priority assignment:** How to systematically assign priorities when parsing system doc? (e.g., "unless" clauses get higher priority)

2. **Context normalization:** Standard vocabulary for seat/vulnerability/competitive?

3. **Pattern matching:** Support for wildcards in sequences? (e.g., "1M" for either major)

4. **Versioning:** How to handle system changes over time?

---

## Next Steps

1. Decide on primary approach
2. Define detailed schema for chosen approach
3. Design text doc → rules parsing strategy
4. Prototype with a single chapter of a real system
