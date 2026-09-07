# Bundled game-data maintenance

`Source Code/Assets/game-data-manifest.json` inventories 14 bundled game datasets.
It records stable dataset IDs, current file/section hashes, the existing record
identity scheme, regions, known patch dates, source provenance and factual
verification limitations. Unknown dates remain `null`; known gaps remain visible.

This is maintenance groundwork, not an automatic game-data updater. There is no
new network downloader, remote JavaScript execution, or data-only update channel.
The existing installer remains the delivery mechanism. User saves and live
market/event/coupon feeds are intentionally outside this static inventory.

## Checking a build

From the repository root:

```powershell
node scripts/build-game-data-manifest.mjs --check
node scripts/test-game-data-manifest.mjs
node scripts/test-workflow-journeys.mjs
```

These checks do not read a user's application profile or access the network.
The workflow journeys execute production functions with controlled clocks,
in-memory storage and mocked external boundaries. They cover chart selection
through refresh, Recipe Book form submission through save/reopen, and weekly
completion through independent Thursday/Sunday resets.

## When game data changes

1. Research the live game for the supported region. Record primary sources and
   distinguish preview/Global Lab changes from live changes.
2. Update identities and values in their existing source files. Preserve save
   compatibility. A matching item name is not enough when a replacement item has
   a new ID.
3. Run `node scripts/build-game-data-manifest.mjs --write`. Changed datasets
   produce `pendingReviews`, including their current dependent revisions.
4. Review each listed dataset, even if its conclusion is **checked, no change**.
   A grind-zone change specifically demands loot, price/alias/vendor value,
   cap/resistance and guide checks. Run the relevant feature tests too.
5. Create a review JSON array using the pending review's exact IDs and hashes:

```json
[
  {
    "datasetId": "grind-zones-and-loot",
    "revision": "COPY_THE_CURRENT_REVISION",
    "reviewer": "Reviewer name or research task reference",
    "reviewedAt": "ACTUAL_REVIEW_DATE_YYYY-MM-DD",
    "sources": ["https://PRIMARY_SOURCE_THAT_WAS_ACTUALLY_CHECKED"],
    "dependencies": [
      {
        "datasetId": "grind-zones-and-loot",
        "revision": "COPY_THE_CURRENT_DEPENDENCY_REVISION",
        "disposition": "updated",
        "notes": "Describe exactly which IDs and values were verified or changed."
      }
    ]
  }
]
```

Include **every** entry from `requiredDatasets` in `dependencies`, using either
`updated` or `checked-no-change`. Do not copy this placeholder as evidence.

6. Run `node scripts/build-game-data-manifest.mjs --write --reviews PATH_TO_REVIEW_JSON`.
   Matching review records are retained in the bundled manifest. Run the checks
   again. Re-running the generator alone never clears pending reviews.

Review records document a maintainer's attestation, not an independent signature
or automated proof of factual correctness. The checker cannot determine whether
someone truly read a source. Reviewers must not mark unresearched values verified.
The initial manifest is an honest inventory of the existing release, not a fresh
audit of every value.

## Before any future data-only channel

Replace legacy name-keyed records with stable IDs and explicit rename migrations;
separate data from executable JavaScript; define strict schemas and bounds; sign
packs with a separately trusted key; verify hashes and signatures; enforce
compatible app/schema versions; install atomically with rollback and a last-good
copy. Resolve existing `review-required` factual gaps separately. None of these
future safeguards is implied to exist merely because a manifest is present.
