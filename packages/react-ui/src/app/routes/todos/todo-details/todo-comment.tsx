import { ApMarkdown } from "@/components/custom/markdown";
import { formatUtils } from "@/lib/utils";
import { MarkdownVariant } from "@activepieces/shared";
import { Download } from "lucide-react";

import { ApAvatar } from "../../../../components/custom/ap-avatar";

export type ActivityItem = {
  type: "comment";
  content: string;
  timestamp: Date;
  authorType: "user" | "flow";
  authorName: string;
  userEmail?: string;
  flowId?: string;
  key?: string;
  id?: string;
  imageUrl?: string;
  pdfUrl?: string;
};

const ImageDisplay = ({ imageUrl }: { imageUrl: string }) => {
  return (
    <div className="mb-4 rounded-lg overflow-hidden border border-border">
      <img 
        src={imageUrl} 
        alt="Todo image" 
        className="w-full h-auto object-cover max-h-96"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />
    </div>
  );
};

const PdfDownloadLink = ({ pdfUrl }: { pdfUrl: string }) => {
  const fileName = pdfUrl.split("/").pop() || "document.pdf";
  return (
    <div className="mb-4 flex items-center gap-2 p-3 bg-muted rounded-lg border border-border hover:bg-muted/80 transition-colors">
      <Download className="h-4 w-4 flex-shrink-0" />
      <a 
        href={pdfUrl} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-sm font-medium text-primary hover:underline flex-1 truncate"
      >
        {fileName}
      </a>
    </div>
  );
};

interface TodoCommentProps {
  comment: ActivityItem;
  showConnector?: boolean;
}

export const TodoComment = ({ comment, showConnector }: TodoCommentProps) => {
  return (
    <div className="relative">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-4">
          <ApAvatar
            type={comment.authorType}
            size="medium"
            fullName={comment.authorName}
            userEmail={comment.userEmail}
          />
          <div className="flex items-center gap-2">
            <div className="text-sm font-bold">{comment.authorName}</div>
            <div className="text-xs text-muted-foreground">
              created {formatUtils.formatDateToAgo(comment.timestamp)}
            </div>
          </div>
        </div>
        <div className="relative">
          {showConnector && (
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
          )}
          <div className="pl-12">
            {comment.imageUrl && <ImageDisplay imageUrl={comment.imageUrl} />}
            {comment.pdfUrl && <PdfDownloadLink pdfUrl={comment.pdfUrl} />}
            <div className="prose prose-sm max-w-none">
              <ApMarkdown
                markdown={comment.content}
                variant={MarkdownVariant.BORDERLESS}
              />
            </div>
          </div>
          {showConnector && <div className="mb-8"></div>}
        </div>
      </div>
    </div>
  );
};
