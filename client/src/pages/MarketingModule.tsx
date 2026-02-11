import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, Workflow, FileText } from "lucide-react";
import Campaigns from "./Campaigns";
import Automations from "./Automations";
import Templates from "./Templates";

export default function MarketingModule() {
    return (
        <div className="space-y-4">
            <Tabs defaultValue="campaigns" className="w-full">
                <div className="flex items-center justify-between mb-4">
                    <TabsList>
                        <TabsTrigger value="campaigns" className="flex items-center gap-2">
                            <Send className="w-4 h-4" />
                            Campañas
                        </TabsTrigger>
                        <TabsTrigger value="automations" className="flex items-center gap-2">
                            <Workflow className="w-4 h-4" />
                            Automatizaciones
                        </TabsTrigger>
                        <TabsTrigger value="templates" className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Plantillas
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="campaigns" className="mt-0">
                    <div className="py-4">
                        <Campaigns />
                    </div>
                </TabsContent>
                <TabsContent value="automations" className="mt-0">
                    <div className="py-4">
                        <Automations />
                    </div>
                </TabsContent>
                <TabsContent value="templates" className="mt-0">
                    <div className="py-4">
                        <Templates />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
