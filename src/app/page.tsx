"use client";

import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";
import swaggerSpec from "./../swagger.json";

export default function Home() {
  return (
    <main style={{ padding: 20 }}>
      <h1>ChatKit API Documentation</h1>
      <SwaggerUI spec={swaggerSpec as any} />
    </main>
  );
}
