import { useState } from "react";
import { Camera, MapPin, Upload, CheckCircle2, Clock, Loader2, Navigation } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { mockCitizenReport } from "../data/mockData";

export function CitizenApp() {
  const [step, setStep] = useState<'form' | 'tracking'>('form');
  const [isGeotagging, setIsGeotagging] = useState(false);
  const [location, setLocation] = useState('');
  const [wasteType, setWasteType] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);

  const handleGeoTag = () => {
    setIsGeotagging(true);
    // Simulate geolocation
    setTimeout(() => {
      setLocation('100 Feet Road, Indiranagar, Bengaluru - 560038');
      setWasteType('Mixed Waste');
      setIsGeotagging(false);
    }, 1500);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    setStep('tracking');
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'submitted':
        return 'bg-blue-500';
      case 'verified':
        return 'bg-purple-500';
      case 'assigned':
        return 'bg-yellow-500';
      case 'in progress':
        return 'bg-orange-500';
      case 'completed':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-[calc(100vh-73px)] bg-gray-50 p-4 lg:p-8">
      <div className="max-w-2xl mx-auto">
        {step === 'form' ? (
          <>
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold mb-2">Report Illegal Waste Dump</h1>
              <p className="text-gray-600">Help keep Bengaluru clean by reporting waste accumulation</p>
            </div>

            {/* Report Form */}
            <Card className="p-6 mb-6">
              <div className="space-y-6">
                {/* Geo-tag Button */}
                <div>
                  <label className="block text-sm font-semibold mb-3">Location</label>
                  <Button
                    onClick={handleGeoTag}
                    disabled={isGeotagging}
                    className="w-full bg-[#2d7738] hover:bg-[#245d2d] h-12"
                  >
                    {isGeotagging ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Getting Location...
                      </>
                    ) : (
                      <>
                        <Navigation className="h-5 w-5 mr-2" />
                        One-Click Geo-Tag
                      </>
                    )}
                  </Button>
                  {location && (
                    <div className="mt-3 p-3 bg-green-50 rounded-lg flex items-start gap-2">
                      <MapPin className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-green-900">Location Detected</p>
                        <p className="text-sm text-green-700">{location}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Photo Upload */}
                <div>
                  <label className="block text-sm font-semibold mb-3">Upload Photo</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#2d7738] transition-colors">
                    {photo ? (
                      <div className="space-y-3">
                        <img src={photo} alt="Uploaded" className="w-full h-48 object-cover rounded-lg" />
                        <label className="cursor-pointer">
                          <span className="text-sm text-[#2d7738] hover:underline">Change Photo</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    ) : (
                      <label className="cursor-pointer block">
                        <Camera className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-sm text-gray-600">Click to upload or take a photo</p>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* AI Auto-fill */}
                {wasteType && (
                  <div>
                    <label className="block text-sm font-semibold mb-2">AI Detected Waste Type</label>
                    <Input value={wasteType} onChange={(e) => setWasteType(e.target.value)} />
                    <p className="text-xs text-gray-500 mt-1">Auto-detected by AI • You can edit this</p>
                  </div>
                )}

                {/* Additional Notes */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Additional Notes (Optional)</label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2d7738] min-h-[100px]"
                    placeholder="Add any additional details about the waste dump..."
                  />
                </div>

                {/* Submit Button */}
                <Button
                  onClick={handleSubmit}
                  disabled={!location || !photo}
                  className="w-full bg-[#2d7738] hover:bg-[#245d2d] h-12 text-base"
                >
                  <Upload className="h-5 w-5 mr-2" />
                  Submit Report
                </Button>
              </div>
            </Card>

            {/* Info Card */}
            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-900 mb-1">Fast Response Time</p>
                  <p className="text-sm text-blue-700">
                    Reports are typically verified within 1 hour and assigned to cleanup crews within 4 hours.
                  </p>
                </div>
              </div>
            </Card>
          </>
        ) : (
          <>
            {/* Report Submitted */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Report Submitted!</h1>
              <p className="text-gray-600">Report ID: {mockCitizenReport.id}</p>
            </div>

            {/* Status Timeline */}
            <Card className="p-6 mb-6">
              <h2 className="font-semibold mb-4">Report Status Timeline</h2>
              <div className="space-y-4">
                {mockCitizenReport.timeline.map((item, index) => {
                  const isLast = index === mockCitizenReport.timeline.length - 1;
                  const isCompleted = index < mockCitizenReport.timeline.length;
                  
                  return (
                    <div key={index} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${getStatusColor(
                            item.status
                          )}`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="h-5 w-5 text-white" />
                          ) : (
                            <Clock className="h-5 w-5 text-white" />
                          )}
                        </div>
                        {!isLast && <div className="w-0.5 h-12 bg-gray-300 my-1"></div>}
                      </div>
                      <div className="flex-1 pb-8">
                        <div className="flex items-start justify-between mb-1">
                          <h3 className="font-semibold">{item.status}</h3>
                          <span className="text-xs text-gray-500">
                            {new Date(item.date).toLocaleString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{item.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Report Details */}
            <Card className="p-6 mb-6">
              <h2 className="font-semibold mb-4">Report Details</h2>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold">Location</p>
                    <p className="text-sm text-gray-600">{mockCitizenReport.address}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Camera className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold mb-2">Photo Evidence</p>
                    <img
                      src={mockCitizenReport.photo}
                      alt="Report"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold">Waste Type</p>
                  <Badge className="mt-1">{mockCitizenReport.wasteType}</Badge>
                </div>
              </div>
            </Card>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={() => setStep('form')}
                variant="outline"
                className="flex-1"
              >
                Submit Another Report
              </Button>
              <Button className="flex-1 bg-[#2d7738] hover:bg-[#245d2d]">
                Share Report
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
