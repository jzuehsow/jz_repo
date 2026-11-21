<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Static reference layers (transportation, geography) live in src/transportation and src/geography, are owned by src/reference/ReferenceLayerHost next to the viewer, and read pre-simplified open datasets from public/data via swappable providers — keeps them lazy, independent of live feeds, and replaceable by REST later.
