# Vendor Stitch Log

This is historical documentation.

The root-level vendor reference tree and vendor-in scripts have been removed.
Future upstream integrations must live in the owning module:

| Capability | Owner |
|------------|-------|
| retrieval-side reference code | DataBase |
| generation-side reference code | ContentBase |
| web evidence provider adapters | web-evidence-provider |

ContentMRS root must not copy vendor code into modules or keep a second
reference tree as executable truth.
