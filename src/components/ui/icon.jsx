
import React from 'react';
import {
  Activity, AlarmClock, AlertCircle, AlignCenter, Archive, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, AtSign, Award,
  Banknote, BarChart, Bell, Bold, Bookmark, Box, Briefcase, Building, Building2,
  Calendar, CalendarDays, CalendarRange, Camera, Car, Check, CheckCircle, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ChevronsUpDown,
  Circle, Clipboard, ClipboardPaste, Clock, Cloud, CloudUpload, Code, Cog, Columns, Command, Contact, Copy, CornerDownLeft, CreditCard, Crop, Crown,
  Database, Delete, DollarSign, Download, Droplet,
  Edit, Edit2, Edit3, ExternalLink, Eye, EyeOff,
  Facebook, FastForward, Feather, File, FileCheck, FileCode, FileDown, FileEdit, FileInput, FileOutput, FilePlus, FileText, FileUp, Filter, Flag, Folder, FolderOpen, FolderPlus, FormInput, Forward, Frown, FunctionSquare,
  GitBranch, GitCommit, GitMerge, GitPullRequest, Github, Gitlab, Globe, Grab, Grid,
  HardDrive, HardHat, Hash, Headphones, Heart, HelpCircle, Home,
  Image, Inbox, Info, Italic,
  Key,
  Laptop, Layers, Layout, LayoutDashboard, LifeBuoy, Link, Link2, Linkedin, List, ListFilter, Loader, Loader2, Lock, LogIn, LogOut,
  Mail, Map, MapPin, Maximize, Maximize2, Menu, MessageCircle, MessageSquare, Mic, Minimize, Minimize2, Minus, Monitor, Moon, MoreHorizontal, MoreVertical, MousePointer, Move, Music,
  Navigation,
  Package, Paperclip, Pause, PenTool, Percent, Phone, PieChart, Pin, Play, Plug, Plus, PlusCircle, Pocket, Power, Printer,
  Radio, RefreshCcw, RefreshCw, Repeat, Rewind, Rocket, RotateCcw, RotateCw, Rss,
  Save, School, Scissors, ScreenShare, Search, Send, Server, Settings, Settings2, Share, Share2, Sheet, Shield, ShoppingBag, ShoppingCart, Shuffle, Sidebar, SkipBack, SkipForward, Slack, Sliders, Smartphone, Smile, Speaker, Star, StopCircle, Sun, Sunset,
  Table, Tablet, Tag, Target, Terminal, ThumbsDown, ThumbsUp, Timer, ToggleLeft, ToggleRight, Wrench, Trash, Trash2, TrendingDown, TrendingUp, Truck, Tv, Twitch, Twitter, Type,
  Umbrella, Underline, Unlock, Unplug, Upload, User, UserCheck, UserCog, UserMinus, UserPlus, UserX, Users,
  Video, Voicemail, Volume, Volume1, Volume2, VolumeX,
  Wallet, Watch, Wifi, Wind,
  X, XCircle,
  Youtube,
  Zap, ZapOff, ZoomIn, ZoomOut
} from 'lucide-react';

const icons = {
  Activity, AlarmClock, AlertCircle, AlignCenter, Archive, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, AtSign, Award,
  Banknote, BarChart, Bell, Bold, Bookmark, Box, Briefcase, Building, Building2,
  Calendar, CalendarDays, CalendarRange, Camera, Car, Check, CheckCircle, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ChevronsUpDown,
  Circle, Clipboard, ClipboardPaste, Clock, Cloud, CloudUpload, Code, Cog, Columns, Command, Contact, Copy, CornerDownLeft, CreditCard, Crop, Crown,
  Database, Delete, DollarSign, Download, Droplet,
  Edit, Edit2, Edit3, ExternalLink, Eye, EyeOff,
  Facebook, FastForward, Feather, File, FileCheck, FileCode, FileDown, FileEdit, FileInput, FileOutput, FilePlus, FileText, FileUp, Filter, Flag, Folder, FolderOpen, FolderPlus, FormInput, Forward, Frown, FunctionSquare,
  GitBranch, GitCommit, GitMerge, GitPullRequest, Github, Gitlab, Globe, Grab, Grid,
  HardDrive, HardHat, Hash, Headphones, Heart, HelpCircle, Home,
  Image, Inbox, Info, Italic,
  Key,
  Laptop, Layers, Layout, LayoutDashboard, LifeBuoy, Link, Link2, Linkedin, List, ListFilter, Loader, Loader2, Lock, LogIn, LogOut,
  Mail, Map, MapPin, Maximize, Maximize2, Menu, MessageCircle, MessageSquare, Mic, Minimize, Minimize2, Minus, Monitor, Moon, MoreHorizontal, MoreVertical, MousePointer, Move, Music,
  Navigation,
  Package, Paperclip, Pause, PenTool, Percent, Phone, PieChart, Pin, Play, Plug, Plus, PlusCircle, Pocket, Power, Printer,
  Radio, RefreshCcw, RefreshCw, Repeat, Rewind, Rocket, RotateCcw, RotateCw, Rss,
  Save, School, Scissors, ScreenShare, Search, Send, Server, Settings, Settings2, Share, Share2, Sheet, Shield, ShoppingBag, ShoppingCart, Shuffle, Sidebar, SkipBack, SkipForward, Slack, Sliders, Smartphone, Smile, Speaker, Star, StopCircle, Sun, Sunset,
  Table, Tablet, Tag, Target, Terminal, ThumbsDown, ThumbsUp, Timer, ToggleLeft, ToggleRight, Wrench, Trash, Trash2, TrendingDown, TrendingUp, Truck, Tv, Twitch, Twitter, Type,
  Umbrella, Underline, Unlock, Unplug, Upload, User, UserCheck, UserCog, UserMinus, UserPlus, UserX, Users,
  Video, Voicemail, Volume, Volume1, Volume2, VolumeX,
  Wallet, Watch, Wifi, Wind,
  X, XCircle,
  Youtube,
  Zap, ZapOff, ZoomIn, ZoomOut
};

export function Icon({ name, className, ...props }) {
  if (!name) return null;

  const iconName = name
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');

  const IconComponent = icons[iconName];

  if (!IconComponent) {
    return <Circle className={className} {...props} />;
  }

  return <IconComponent className={className} {...props} />;
}
