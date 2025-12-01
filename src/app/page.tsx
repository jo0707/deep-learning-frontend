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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const DEFAULT_SERVER_URL = "https://afenmarbun-backend-deep-learning.hf.space/predict";

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { toast } = useToast();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isRealtimeActive = useRef(false);

  useEffect(() => {
    const storedUrl = localStorage.getItem("inference_server_url");
    setServerUrl(storedUrl || DEFAULT_SERVER_URL);
  }, []);

  const stopWebcam = () => {
    isRealtimeActive.current = false;
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const classifyImage = useCallback(async (file: File | Blob) => {
    setIsLoading(true);
    setErrorMessage(null); // Reset error on new classification
    
    if (!serverUrl) {
      toast({
        variant: "destructive",
        title: "Configuration Error",
        description: "Inference server URL is not set.",
      });
      setIsLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(serverUrl, {
        method: "POST",
        headers: {
          "ngrok-skip-browser-warning": "true",
        },
        body: formData,
      });

      if (!response.ok) {
        // Handle HTTP errors like 400 or 500
        setErrorMessage("Gagal mendeteksi wajah, pastikan wajah ada di frame kamera.");
        setPredictions([]);
        throw new Error(`Server responded with ${response.status}`);
      }

      const data = await response.json();
      if (data.error) {
        setErrorMessage("Gagal mendeteksi wajah, pastikan wajah ada di frame kamera.");
        setPredictions([]);
        throw new Error(data.error);
      }
      
      if (data.predictions && data.predictions.length > 0) {
        setPredictions(data.predictions);
      } else {
        setPredictions([]);
        setErrorMessage("Gagal mendeteksi wajah, pastikan wajah ada di frame kamera.");
      }

    } catch (error) {
      console.error("Classification error:", error);
      // We show the specific error message, so a generic toast is not always needed
      if (!errorMessage && !isRealtimeActive.current) {
        const errorMsg = error instanceof Error ? error.message : "An unknown error occurred.";
        toast({
          variant: "destructive",
          title: "Classification Failed",
          description: errorMsg,
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [serverUrl, toast, errorMessage]);

  const realtimeLoop = useCallback(async () => {
    while (isRealtimeActive.current) {
      if (videoRef.current && canvasRef.current && videoRef.current.readyState === 4) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");

        if (context) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
          
          const dataUrl = canvas.toDataURL("image/jpeg");
          setImageSrc(dataUrl);

          await new Promise<void>((resolve) => {
            canvas.toBlob(async (blob) => {
              if (blob && isRealtimeActive.current) {
                await classifyImage(blob);
              }
              resolve();
            }, "image/jpeg");
          });
        }
      }
      // Give browser a moment to breathe
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }, [classifyImage]);

  const startWebcam = useCallback(async () => {
    stopWebcam(); // Ensure any previous stream is stopped
    setPredictions([]);
    setImageSrc(null);
    setErrorMessage(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          isRealtimeActive.current = true;
          realtimeLoop();
        }
      }
    } catch (error) {
      console.error("Error accessing webcam:", error);
      toast({
        variant: "destructive",
        title: "Webcam Error",
        description: "Could not access webcam. Please check permissions.",
      });
      isRealtimeActive.current = false;
    }
  }, [toast, realtimeLoop]);

  
  useEffect(() => {
    return () => {
      stopWebcam();
    };
  }, []);

  const handleTabChange = (value: string) => {
    setErrorMessage(null);
    if (value === "webcam") {
      startWebcam();
    } else {
      stopWebcam();
    }
  };

  const handleFileChange = (files: FileList | null) => {
    if (files && files[0]) {
      stopWebcam();
      setErrorMessage(null);
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
      };
      reader.readAsDataURL(file);
      classifyImage(file);
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
    setErrorMessage(null);
    if (isRealtimeActive.current) {
      stopWebcam();
    }
  };
  
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-background/80 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
          <ScanFace className="h-8 w-8 text-primary" />
          <h1 className="text-xl sm:text-2xl font-bold font-headline">Image Insight</h1>
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
                      className="mt-4 border-2 border-dashed border-border rounded-lg p-10 text-center cursor-pointer transition-colors hover:border-primary"
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
                      {isRealtimeActive.current && !videoRef.current?.srcObject &&
                        <div className="absolute text-white">Starting camera...</div>
                      }
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {imageSrc && (
              <Card className="bg-card/50 lg:hidden">
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

          <div className="flex flex-col gap-8">
            {imageSrc && (
              <Card className="bg-card/50 hidden lg:block">
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

            <Card className="bg-card/50 flex-grow">
              <CardHeader>
                <CardTitle>Classification Result</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-start h-full min-h-[300px] sm:min-h-[400px]">
                {isLoading && predictions.length === 0 && !errorMessage ? (
                    <div className="w-full space-y-2 animate-pulse pt-8">
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                    </div>
                ) : errorMessage ? (
                  <div className="text-center text-destructive flex-grow flex flex-col items-center justify-center">
                    <Alert variant="destructive" className="max-w-sm">
                      <AlertTitle>Deteksi Gagal</AlertTitle>
                      <AlertDescription>{errorMessage}</AlertDescription>
                    </Alert>
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
        </div>
      </main>
    </div>
  );
}
