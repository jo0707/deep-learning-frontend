"use client";

import { useState } from "react";
import { Settings, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

type ServerUrlConfigProps = {
  serverUrl: string;
  setServerUrl: (url: string) => void;
  defaultUrl: string;
};

export function ServerUrlConfig({ serverUrl, setServerUrl, defaultUrl }: ServerUrlConfigProps) {
  const [localUrl, setLocalUrl] = useState(serverUrl);
  const { toast } = useToast();

  const handleSave = () => {
    localStorage.setItem("inference_server_url", localUrl);
    setServerUrl(localUrl);
    toast({
      title: "Settings Saved",
      description: "Inference server URL has been updated.",
    });
  };

  const handleReset = () => {
    setLocalUrl(defaultUrl);
    localStorage.setItem("inference_server_url", defaultUrl);
    setServerUrl(defaultUrl);
    toast({
      title: "Settings Reset",
      description: "Inference server URL has been reset to default.",
    });
  };

  return (
    <Dialog onOpenChange={(open) => open && setLocalUrl(serverUrl)}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Configuration</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="server-url" className="text-right col-span-1">
              Server URL
            </Label>
            <Input
              id="server-url"
              value={localUrl}
              onChange={(e) => setLocalUrl(e.target.value)}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={handleReset}>Reset to Default</Button>
          <DialogClose asChild>
            <Button onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" />
              Save changes
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
