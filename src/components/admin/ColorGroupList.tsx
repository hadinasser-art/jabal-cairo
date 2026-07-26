import { ColorGroup } from "@/components/admin/ColorGroup";
import type { useColorGroups } from "@/components/admin/useColorGroups";
import type { usePhotoMutations } from "@/components/admin/usePhotoMutations";
import type { AdminInventoryRow, AdminMediaRow } from "@/components/admin/types";

interface ColorGroupListProps {
  colors: string[];
  productMedia: AdminMediaRow[];
  productVariants: AdminInventoryRow[];
  photos: ReturnType<typeof usePhotoMutations>;
  groups: ReturnType<typeof useColorGroups>;
}

/**
 * Renders one ColorGroup per color plus the trailing "No color" group. Both used to be
 * wired up separately with the same twenty callbacks; `null` is just the last entry now.
 */
export function ColorGroupList({
  colors,
  productMedia,
  productVariants,
  photos,
  groups,
}: ColorGroupListProps) {
  const entries: (string | null)[] = [...colors, null];

  return (
    <div className="grid gap-4">
      {entries.map((color, index) => (
        <ColorGroup
          key={color ?? "__unassigned__"}
          color={color}
          rows={productMedia.filter((row) => row.color === color)}
          variantCount={
            color ? productVariants.filter((variant) => variant.color === color).length : 0
          }
          colorPosition={index}
          colorCount={colors.length}
          uploadJobs={photos.uploadJobs.filter((job) => job.color === color)}
          drafts={photos.drafts}
          saveStates={photos.saveStates}
          busy={color ? groups.colorBusy !== null : false}
          onFiles={(files) => void photos.uploadFiles(color, files)}
          onRename={(nextColor) =>
            color ? groups.renameColor(color, nextColor) : Promise.resolve(false)
          }
          onDeleteGroup={() => {
            if (color) void groups.deleteColorGroup(color);
          }}
          onMoveGroup={(direction) => {
            if (color) groups.moveColor(color, direction);
          }}
          onGroupDragStart={(event) => {
            if (color) groups.startColorDrag(event, color);
          }}
          onGroupDrop={(event) => {
            if (color) groups.dropColor(event, color);
            else event.preventDefault();
          }}
          onLabelChange={photos.changeLabel}
          onLabelCommit={photos.commitLabel}
          onKindChange={photos.changeKind}
          onReplace={(row, file) => void photos.replacePhoto(row, file)}
          onDeletePhoto={(row) => void photos.deletePhoto(row)}
          onMovePhoto={(rowId, direction) => photos.movePhoto(color, rowId, direction)}
          onPhotoDragStart={photos.startPhotoDrag}
          onPhotoDrop={(event, rowId) => photos.dropPhoto(event, color, rowId)}
        />
      ))}
    </div>
  );
}
