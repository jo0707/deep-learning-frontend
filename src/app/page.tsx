"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { Camera, ScanFace, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ServerUrlConfig } from "@/components/server-url-config";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const DEFAULT_SERVER_URL = "http://127.0.0.1:5001/predict";

type Prediction = {
  class: string;
  confidence: number;
  confidence_percent: string;
  rank: number;
};

export default function Home() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [serverUrl, setServerUrl] = useState<string>("");
  const { toast } = useToast();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const storedUrl = localStorage.getItem("inference_server_url");
    setServerUrl(storedUrl || DEFAULT_SERVER_URL);
  }, []);

  const startWebcam = useCallback(async () => {
    setPredictions([]);
    setImageSrc(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }
    } catch (error) {
      console.error("Error accessing webcam:", error);
      toast({
        variant: "destructive",
        title: "Webcam Error",
        description: "Could not access webcam. Please check permissions.",
      });
    }
  }, [toast]);

  const stopWebcam = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };
  
  useEffect(() => {
    return () => {
      stopWebcam();
    };
  }, []);


  const handleTabChange = (value: string) => {
    if (value === "webcam") {
      startWebcam();
    } else {
      stopWebcam();
    }
  };

  const classifyImage = useCallback(async (base64Image: string) => {
    setIsLoading(true);
    setPredictions([]);
    if (!serverUrl) {
      toast({
        variant: "destructive",
        title: "Configuration Error",
        description: "Inference server URL is not set.",
      });
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(serverUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({ image: base64Image.split(",")[1] }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      
      if (data.predictions && data.predictions.length > 0) {
        setPredictions(data.predictions);
      } else {
        toast({
          variant: "destructive",
          title: "Classification Failed",
          description: "No predictions found in the response.",
        });
      }

    } catch (error) {
      console.error("Classification error:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({
        variant: "destructive",
        title: "Classification Failed",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }, [serverUrl, toast]);

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const dataUrl = canvas.toDataURL("image/jpeg");
        setImageSrc(dataUrl);
        classifyImage(dataUrl);
        stopWebcam();
      }
    }
  };

  const handleFileChange = (files: FileList | null) => {
    if (files && files[0]) {
      const file = files[0];
      if (!file.type.startsWith("image/")) {
        toast({
          variant: "destructive",
          title: "Invalid File",
          description: "Please upload an image file.",
        });
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setImageSrc(dataUrl);
        classifyImage(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('border-primary');
    handleFileChange(e.dataTransfer.files);
  };
  
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.add('border-primary');
  };

  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('border-primary');
  };

  const clearImage = () => {
    setImageSrc(null);
    setPredictions([]);
  };
  
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-background/80 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
          <ScanFace className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold font-headline">Image Insight</h1>
        </div>
        <ServerUrlConfig
          serverUrl={serverUrl}
          setServerUrl={setServerUrl}
          defaultUrl={DEFAULT_SERVER_URL}
        />
      </header>

      <main className="flex-grow p-4 sm:p-6 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
          <div className="flex flex-col gap-8">
            <Card className="bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Input Image
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="upload" className="w-full" onValueChange={handleTabChange}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="upload">
                      <Upload className="mr-2 h-4 w-4" /> Upload
                    </TabsTrigger>
                    <TabsTrigger value="webcam">
                      <Camera className="mr-2 h-4 w-4" /> Webcam
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="upload">
                    <div
                      className="mt-4 border-2 border-dashed border-border rounded-lg p-10 text-center cursor-pointer transition-colors"
                      onDrop={onDrop}
                      onDragOver={onDragOver}
                      onDragLeave={onDragLeave}
                      onClick={() => document.getElementById("file-upload")?.click()}
                    >
                      <Upload className="mx-auto h-12 w-12 text-primary" />
                      <p className="mt-2 text-sm text-primary">
                        Drag & drop an image or click to upload
                      </p>
                      <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e.target.files)}
                      />
                    </div>
                  </TabsContent>
                  <TabsContent value="webcam">
                    <div className="mt-4 relative bg-black rounded-lg aspect-video flex items-center justify-center">
                      <video
                        ref={videoRef}
                        className="w-full h-auto rounded-lg"
                        muted
                        playsInline
                      />
                      <canvas ref={canvasRef} className="hidden" />
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                        <Button onClick={captureImage} size="lg" className="rounded-full h-16 w-16" disabled={isLoading}>
                          <Camera className="h-8 w-8" />
                          <span className="sr-only">Capture</span>
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {imageSrc && (
              <Card className="bg-card/50">
                <CardContent className="pt-6">
                  <div className="relative w-full max-w-md mx-auto aspect-square">
                    <Image
                      src={imageSrc}
                      alt="Input for classification"
                      fill
                      className="object-contain rounded-lg"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 bg-background/50 hover:bg-background/80 rounded-full"
                      onClick={clearImage}
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Clear image</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            
          </div>

          <Card className="bg-card/50">
            <CardHeader>
              <CardTitle>Classification Result</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-start h-full min-h-[400px]">
              {isLoading ? (
                  <div className="w-full space-y-2 animate-pulse pt-8">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
              ) : predictions.length > 0 ? (
                <div className="w-full animate-in fade-in duration-500">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">Rank</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead className="text-right">Confidence</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {predictions.map((pred) => (
                        <TableRow key={pred.rank} className={pred.rank === 1 ? "bg-primary/20" : ""}>
                          <TableCell className="font-medium">{pred.rank}</TableCell>
                          <TableCell>{pred.class}</TableCell>
                          <TableCell className="text-right">{pred.confidence_percent}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center text-muted-foreground flex-grow flex flex-col items-center justify-center">
                  <ScanFace className="mx-auto h-16 w-16" />
                  <p className="mt-4">Your results will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
